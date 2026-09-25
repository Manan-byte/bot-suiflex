const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  StreamType
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const prism = require('prism-media');

const TOKEN = process.env.DISCORD_TOKEN || Buffer.from("TVRVMU1qTXdNamt5TURreE1qQTRNRGt5TncuR29zcUlFLlFQZjU5WjQyY0NULXVWcFVIVU1DV0Y3T1VZUnZhak11NTZfNkZV", "base64").toString("utf-8");
const YTDLP_PATH = process.platform === 'win32'
  ? (fs.existsSync(path.join(__dirname, 'yt-dlp.exe')) ? path.join(__dirname, 'yt-dlp.exe') : 'yt-dlp')
  : (fs.existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp');
const DYNAMIC_LOFI_QUERY = "ytsearch1:lofi hip hop radio live beats to relax study to";
const LOFI_STREAM_URL = "https://www.youtube.com/watch?v=jfKfPfyJRdk";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const musicQueues = new Map();

function getOrCreateQueue(guildId) {
  if (!musicQueues.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: 250
      }
    });

    musicQueues.set(guildId, {
      connection: null,
      player: player,
      currentProcess: null,
      queue: [],
      current: null,
      loopQueue: false,
      mode247: false,
      isRadio: false,
      message: null,
      lastTextChannel: null,
      leaveTimeout: null
    });
  }
  return musicQueues.get(guildId);
}

function searchSongWithYtDlp(rawQuery) {
  return new Promise((resolve) => {
    let query = rawQuery.replace(/^[<"']|[>"']$/g, '').trim();
    const isUrl = /^https?:\/\//i.test(query);
    const searchArg = isUrl ? query : `ytsearch1:${query}`;

    const proc = spawn(YTDLP_PATH, [
      '--dump-single-json',
      '--no-playlist',
      '--skip-download',
      searchArg
    ]);

    let output = '';
    proc.stdout.on('data', chunk => output += chunk);
    proc.stderr.on('data', () => {});
    proc.on('close', () => {
      try {
        const json = JSON.parse(output);
        const entry = json.entries ? json.entries[0] : json;
        if (!entry || !entry.title) return resolve(null);

        resolve({
          title: entry.title,
          url: entry.webpage_url || entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
          durationFormatted: entry.duration_string || 'LIVE',
          thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url
        });
      } catch (e) {
        resolve(null);
      }
    });
  });
}

function createStreamFromYtDlp(url) {
  const ytProc = spawn(YTDLP_PATH, [
    '-o', '-',
    '-f', 'ba/b',
    '--no-playlist',
    url
  ]);

  const ffmpeg = new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ]
  });

  const pcmStream = ytProc.stdout.pipe(ffmpeg);

  return {
    stream: pcmStream,
    kill: () => {
      try { ytProc.kill(); } catch (e) {}
      try { ffmpeg.destroy(); } catch (e) {}
    }
  };
}

function buildMusicCard(song, isPaused = false, queueLength = 0, loopQueue = false, mode247 = false, isRadio = false) {
  const embed = new EmbedBuilder()
    .setColor(isRadio ? 0x9B59B6 : (isPaused ? 0xFEE75C : 0x5865F2))
    .setTitle(isRadio ? "📻 24/7 LOFI RADIO MODE" : (isPaused ? "⏸️ NOW PAUSED" : "🎵 NOW PLAYING"))
    .setDescription(
      `**[${song.title}](${song.url})**\n\n` +
      `⏱️ **${song.durationFormatted || '--:--'}**  •  ` +
      `👤 **${song.requestedBy.split('#')[0]}**  •  ` +
      `📜 **${queueLength} antrean**\n` +
      `🔁 **Loop:** \`${loopQueue ? 'ON' : 'OFF'}\`  •  ` +
      `📻 **24/7:** \`${mode247 ? 'ON' : 'OFF'}\``
    );

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  // Symmetrical 2x3 Button Matrix
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_pause_resume')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_skip')
      .setLabel('Skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_loop_queue')
      .setLabel(`Loop: ${loopQueue ? 'ON' : 'OFF'}`)
      .setEmoji('🔁')
      .setStyle(loopQueue ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_radio_247')
      .setLabel(`24/7: ${mode247 ? 'ON' : 'OFF'}`)
      .setEmoji('📻')
      .setStyle(mode247 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_queue')
      .setLabel('Antrean')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function repostPlayerCardAtBottom(serverQueue, channel) {
  if (!serverQueue || !serverQueue.current) return;
  const targetChannel = channel || serverQueue.lastTextChannel;
  if (!targetChannel) return;

  const isPaused = serverQueue.player.state.status === AudioPlayerStatus.Paused || serverQueue.player.state.status === AudioPlayerStatus.AutoPaused;
  const payload = buildMusicCard(serverQueue.current, isPaused, serverQueue.queue.length, serverQueue.loopQueue, serverQueue.mode247, serverQueue.isRadio);

  if (serverQueue.message) {
    try {
      await serverQueue.message.delete().catch(() => {});
    } catch (e) {}
    serverQueue.message = null;
  }

  try {
    serverQueue.message = await targetChannel.send(payload).catch(() => null);
  } catch (e) {}
}
async function startLofiRadio(serverQueue, textChannel) {
  serverQueue.isRadio = true;
  try {
    // Dynamically resolve active live stream
    const liveData = await searchSongWithYtDlp(DYNAMIC_LOFI_QUERY);
    const streamUrl = liveData?.url || "https://www.youtube.com/watch?v=rFZHOHl-L8A";

    serverQueue.current = {
      title: liveData?.title || "Lofi Hip Hop Radio · Beats to Relax/Study to",
      url: streamUrl,
      durationFormatted: "24/7 LIVE",
      thumbnail: liveData?.thumbnail || "https://i.ytimg.com/vi/rFZHOHl-L8A/maxresdefault.jpg",
      requestedBy: "Auto-Radio 24/7"
    };

    if (serverQueue.currentProcess) {
      serverQueue.currentProcess.kill();
      serverQueue.currentProcess = null;
    }

    const audioStreamHandle = createStreamFromYtDlp(streamUrl);
    serverQueue.currentProcess = audioStreamHandle;

    const resource = createAudioResource(audioStreamHandle.stream, {
      inputType: StreamType.Raw
    });

    serverQueue.player.play(resource);
    await repostPlayerCardAtBottom(serverQueue, textChannel || serverQueue.lastTextChannel);
  } catch (err) {
    console.error("Lofi stream error:", err);
  }
}

async function playNext(guildId, textChannel) {
  const serverQueue = musicQueues.get(guildId);
  if (!serverQueue) return;

  if (textChannel) serverQueue.lastTextChannel = textChannel;

  if (serverQueue.currentProcess) {
    serverQueue.currentProcess.kill();
    serverQueue.currentProcess = null;
  }

  if (serverQueue.loopQueue && serverQueue.current && !serverQueue.isRadio) {
    serverQueue.queue.push(serverQueue.current);
  }

  if (serverQueue.queue.length === 0) {
    serverQueue.current = null;

    // Auto-transition to 24/7 Lofi Radio if enabled
    if (serverQueue.mode247) {
      return startLofiRadio(serverQueue, serverQueue.lastTextChannel);
    }

    if (serverQueue.message) {
      serverQueue.message.delete().catch(() => {});
      serverQueue.message = null;
    }
    const idleEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription("⏹️ **Antrean selesai.** Menunggu lagu baru...");
    if (serverQueue.lastTextChannel) serverQueue.lastTextChannel.send({ embeds: [idleEmbed] }).catch(() => {});
    return;
  }
  serverQueue.isRadio = false;
  const song = serverQueue.queue.shift();
  serverQueue.current = song;

  try {
    const audioStreamHandle = createStreamFromYtDlp(song.url);
    serverQueue.currentProcess = audioStreamHandle;

    const resource = createAudioResource(audioStreamHandle.stream, {
      inputType: StreamType.Raw
    });

    serverQueue.player.play(resource);
    await repostPlayerCardAtBottom(serverQueue, serverQueue.lastTextChannel);
  } catch (err) {
    console.error("Error playing audio stream:", err);
    if (serverQueue.lastTextChannel) {
      serverQueue.lastTextChannel.send(`⚠️ Gagal memutar **${song.title}**: ${err.message || 'Stream error'}`).catch(() => {});
    }
    playNext(guildId, serverQueue.lastTextChannel);
  }
}

async function handleSingleCommand(parsedLine, message, serverQueue, voiceChannel) {
  const { command, args, isNext } = parsedLine;
  const query = args.join(' ').replace(/^["']|["']$/g, '');
  if (!query) return null;

  const result = await searchSongWithYtDlp(query);
  if (!result) return null;

  const songInfo = {
    title: result.title,
    url: result.url,
    durationFormatted: result.durationFormatted,
    thumbnail: result.thumbnail,
    requestedBy: message.author.tag
  };

  const isAlreadyInSameRoom = serverQueue.connection &&
    serverQueue.connection.state.status !== VoiceConnectionStatus.Destroyed &&
    serverQueue.connection.joinConfig.channelId === voiceChannel.id;

  if (!isAlreadyInSameRoom) {
    if (serverQueue.connection && serverQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      try { serverQueue.connection.destroy(); } catch (e) {}
      serverQueue.connection = null;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    serverQueue.connection = connection;
    connection.subscribe(serverQueue.player);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
      playNext(message.guild.id, message.channel);
    });

    serverQueue.player.on('error', (error) => {
      console.error("Player error:", error);
      playNext(message.guild.id, message.channel);
    });
  }

  if (serverQueue.leaveTimeout) {
    clearTimeout(serverQueue.leaveTimeout);
    serverQueue.leaveTimeout = null;
  }

  if (isNext) {
    serverQueue.queue.unshift(songInfo);
  } else {
    serverQueue.queue.push(songInfo);
  }

  return { songInfo, isNext };
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  console.log(`[USER-CMD] #${message.channel.name}: "${message.content}" from ${message.author.tag}`);

  const serverQueue = getOrCreateQueue(message.guild.id);
  serverQueue.lastTextChannel = message.channel;

  const lines = message.content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const parsedCommands = [];

  for (const rawLine of lines) {
    let line = rawLine.replace(/<[@#][!&]?\d+>/g, '').trim();
    if (!line) continue;

    let isNext = false;
    let cmd = null;
    let queryArgs = [];

    if (line.toLowerCase().startsWith('next play ')) {
      isNext = true;
      cmd = 'playnext';
      queryArgs = line.slice(10).trim().split(/ +/);
    } else if (line.toLowerCase().startsWith('play next ')) {
      isNext = true;
      cmd = 'playnext';
      queryArgs = line.slice(10).trim().split(/ +/);
    } else if (line.toLowerCase().startsWith('next ') && !line.toLowerCase().startsWith('nextplay')) {
      isNext = true;
      cmd = 'playnext';
      queryArgs = line.slice(5).trim().split(/ +/);
    } else if (line.toLowerCase().startsWith('!playnext ') || line.toLowerCase().startsWith('!nextplay ') || line.toLowerCase().startsWith('!pn ')) {
      isNext = true;
      cmd = 'playnext';
      queryArgs = line.slice(line.indexOf(' ') + 1).trim().split(/ +/);
    } else if (line.toLowerCase().startsWith('play ')) {
      isNext = false;
      cmd = 'play';
      queryArgs = line.slice(5).trim().split(/ +/);
    } else if (line.toLowerCase().startsWith('!play ') || line.toLowerCase().startsWith('!p ')) {
      isNext = false;
      cmd = 'play';
      queryArgs = line.slice(line.indexOf(' ') + 1).trim().split(/ +/);
    } else if (line.toLowerCase() === 'skip' || line.toLowerCase() === '!skip' || line.toLowerCase() === '!s' || line.toLowerCase() === 'next') {
      cmd = 'skip';
    } else if (line.toLowerCase() === 'stop' || line.toLowerCase() === '!stop') {
      cmd = 'stop';
    } else if (line.toLowerCase() === 'pause' || line.toLowerCase() === '!pause') {
      cmd = 'pause';
    } else if (line.toLowerCase() === 'resume' || line.toLowerCase() === '!resume') {
      cmd = 'resume';
    } else if (line.toLowerCase() === 'queue' || line.toLowerCase() === '!queue' || line.toLowerCase() === '!q') {
      cmd = 'queue';
    } else if (line.toLowerCase() === 'loop' || line.toLowerCase() === '!loop') {
      cmd = 'loop';
    } else if (line.toLowerCase() === '24/7' || line.toLowerCase() === 'lofi' || line.toLowerCase() === '!lofi' || line.toLowerCase() === '!24/7') {
      cmd = '24/7';
    } else {
      isNext = false;
      cmd = 'play';
      queryArgs = line.split(/ +/);
    }

    if (cmd) {
      parsedCommands.push({ command: cmd, args: queryArgs, isNext });
    }
  }

  if (parsedCommands.length === 0) return;

  const rawPlayCommands = parsedCommands.filter(p => p.command === 'play' || p.command === 'playnext');

  const seenQueries = new Set();
  const playCommands = [];
  for (const p of rawPlayCommands) {
    const qKey = p.args.join(' ').toLowerCase().trim();
    if (!seenQueries.has(qKey)) {
      seenQueries.add(qKey);
      playCommands.push(p);
    }
  }

  if (playCommands.length > 0) {
    // 1. Check message.member.voice.channel
    let voiceChannel = message.member?.voice?.channel;

    // 2. If message is sent in a voice channel text chat (channel.type === 2), that IS the voice channel!
    if (!voiceChannel && message.channel.type === ChannelType.GuildVoice) {
      voiceChannel = message.channel;
    }

    // 3. Fallback: inspect guild voiceStates cache
    if (!voiceChannel) {
      const vs = message.guild.voiceStates.cache.get(message.author.id);
      if (vs && vs.channelId) {
        voiceChannel = message.guild.channels.cache.get(vs.channelId);
      }
    }

    // 4. Fallback: fetch member freshly from API
    if (!voiceChannel) {
      try {
        const fetchedMember = await message.guild.members.fetch(message.author.id);
        if (fetchedMember.voice && fetchedMember.voice.channelId) {
          voiceChannel = message.guild.channels.cache.get(fetchedMember.voice.channelId);
        }
      } catch (e) {}
    }

    if (!voiceChannel) {
      return message.reply("🔊 Kamu harus masuk ke Voice Channel dulu untuk memutar musik!");
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(playCommands.length === 1 ? `🔎 *Mencari lagu...*` : `🔎 *Memproses ${playCommands.length} lagu sekaligus...*`);
    const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

    const addedSongs = [];
    const addedUrls = new Set();

    for (const pCmd of playCommands) {
      try {
        const res = await handleSingleCommand(pCmd, message, serverQueue, voiceChannel);
        if (res && res.songInfo) {
          if (!addedUrls.has(res.songInfo.url)) {
            addedUrls.add(res.songInfo.url);
            addedSongs.push(res);
          }
        }
      } catch (err) {
        console.error("Batch play error:", err);
      }
    }

    if (addedSongs.length === 0) {
      const notFoundEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription("❌ Lagu tidak ditemukan. Pastikan judulnya benar!");
      return loadingMsg.edit({ embeds: [notFoundEmbed] });
    }

    const isAlreadyPlaying = serverQueue.player.state.status === AudioPlayerStatus.Playing || serverQueue.player.state.status === AudioPlayerStatus.Paused;

    if (!isAlreadyPlaying) {
      await loadingMsg.delete().catch(() => {});
      playNext(message.guild.id, message.channel);
    } else {
      const summaryList = addedSongs.map((item, idx) => {
        const tag = item.isNext ? "⏭️ [NEXT]" : "✅";
        return `${tag} **[${item.songInfo.title}](${item.songInfo.url})** (\`${item.songInfo.durationFormatted || '--:--'}\`)`;
      }).join('\n');

      const batchEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(addedSongs.length === 1 ? (addedSongs[0].isNext ? "⏭️ DISISIPKAN KE URUTAN BERIKUTNYA" : "✅ DITAMBAHKAN KE ANTREAN") : `🎶 Berhasil Menambahkan ${addedSongs.length} Lagu ke Antrean`)
        .setDescription(summaryList)
        .setFooter({ text: `Total antrean saat ini: ${serverQueue.queue.length} lagu` });

      await loadingMsg.edit({ embeds: [batchEmbed] });
      await repostPlayerCardAtBottom(serverQueue, message.channel);
    }
  }

  for (const cmdItem of parsedCommands) {
    if (cmdItem.command === 'skip') {
      if (serverQueue && serverQueue.current) serverQueue.player.stop();
    } else if (cmdItem.command === 'stop') {
      if (serverQueue) {
        serverQueue.queue = [];
        serverQueue.current = null;
        serverQueue.loopQueue = false;
        serverQueue.mode247 = false;
        serverQueue.player.stop();
        if (serverQueue.currentProcess) {
          serverQueue.currentProcess.kill();
          serverQueue.currentProcess = null;
        }
        if (serverQueue.connection) {
          serverQueue.connection.destroy();
          serverQueue.connection = null;
        }
        if (serverQueue.message) {
          serverQueue.message.delete().catch(() => {});
          serverQueue.message = null;
        }
      }
    } else if (cmdItem.command === 'pause') {
      serverQueue.player.pause();
      repostPlayerCardAtBottom(serverQueue, message.channel);
    } else if (cmdItem.command === 'resume') {
      serverQueue.player.unpause();
      repostPlayerCardAtBottom(serverQueue, message.channel);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const serverQueue = musicQueues.get(interaction.guildId);
  if (!serverQueue) {
    return interaction.deferUpdate().catch(() => {});
  }

  if (interaction.customId === 'btn_pause_resume') {
    const isCurrentlyPaused = serverQueue.player.state.status === AudioPlayerStatus.Paused || serverQueue.player.state.status === AudioPlayerStatus.AutoPaused;

    if (isCurrentlyPaused) {
      serverQueue.player.unpause();
      if (serverQueue.current) {
        const updatedPayload = buildMusicCard(serverQueue.current, false, serverQueue.queue.length, serverQueue.loopQueue, serverQueue.mode247, serverQueue.isRadio);
        return interaction.update(updatedPayload).catch(() => {});
      }
    } else {
      serverQueue.player.pause();
      if (serverQueue.current) {
        const updatedPayload = buildMusicCard(serverQueue.current, true, serverQueue.queue.length, serverQueue.loopQueue, serverQueue.mode247, serverQueue.isRadio);
        return interaction.update(updatedPayload).catch(() => {});
      }
    }
    return interaction.deferUpdate().catch(() => {});
  } else if (interaction.customId === 'btn_skip') {
    serverQueue.player.stop();
    return interaction.deferUpdate().catch(() => {});
  } else if (interaction.customId === 'btn_loop_queue') {
    serverQueue.loopQueue = !serverQueue.loopQueue;
    if (serverQueue.current) {
      const isPaused = serverQueue.player.state.status === AudioPlayerStatus.Paused || serverQueue.player.state.status === AudioPlayerStatus.AutoPaused;
      const updatedPayload = buildMusicCard(serverQueue.current, isPaused, serverQueue.queue.length, serverQueue.loopQueue, serverQueue.mode247, serverQueue.isRadio);
      return interaction.update(updatedPayload).catch(() => {});
    }
    return interaction.deferUpdate().catch(() => {});
  } else if (interaction.customId === 'btn_radio_247') {
    serverQueue.mode247 = !serverQueue.mode247;
    if (serverQueue.mode247 && (!serverQueue.current || serverQueue.player.state.status === AudioPlayerStatus.Idle)) {
      startLofiRadio(serverQueue, interaction.channel);
      return interaction.deferUpdate().catch(() => {});
    } else if (serverQueue.current) {
      const isPaused = serverQueue.player.state.status === AudioPlayerStatus.Paused || serverQueue.player.state.status === AudioPlayerStatus.AutoPaused;
      const updatedPayload = buildMusicCard(serverQueue.current, isPaused, serverQueue.queue.length, serverQueue.loopQueue, serverQueue.mode247, serverQueue.isRadio);
      return interaction.update(updatedPayload).catch(() => {});
    }
    return interaction.deferUpdate().catch(() => {});
  } else if (interaction.customId === 'btn_stop') {
    serverQueue.queue = [];
    serverQueue.current = null;
    serverQueue.loopQueue = false;
    serverQueue.mode247 = false;
    serverQueue.player.stop();
    if (serverQueue.currentProcess) {
      serverQueue.currentProcess.kill();
      serverQueue.currentProcess = null;
    }
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
      serverQueue.connection = null;
    }
    if (serverQueue.message) {
      serverQueue.message.delete().catch(() => {});
      serverQueue.message = null;
    }
    const stoppedEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setDescription("⏹️ Pemutaran dihentikan & bot keluar.");
    return interaction.update({ embeds: [stoppedEmbed], components: [] }).catch(() => {});
  } else if (interaction.customId === 'btn_queue') {
    let qStr = `**Sedang Memutar:**\n🎶 ${serverQueue.current?.title || '-'}\n\n**Antrean Berikutnya:**\n`;
    if (serverQueue.queue.length === 0) {
      qStr += "*(Kosong)*";
    } else {
      qStr += serverQueue.queue.map((s, i) => `\`${i + 1}.\` ${s.title}`).slice(0, 5).join('\n');
    }
    return interaction.reply({ content: qStr, flags: 64 });
  }
});

client.once('ready', () => {
  console.log(`🎶 Diva Music Bot (Always Listen) aktif sebagai ${client.user.tag}!`);
});

client.login(TOKEN);
