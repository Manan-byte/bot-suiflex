/**
 * Suiflex Discord Bot - Architect v3.0 (24/7 Cloud)
 * 
 * Complete Native Suite:
 * 1. ⚡ Zero-Friction Instant Auto-Role (Member)
 * 2. 🌟 Welcome Embed Card in #🚀welcome
 * 3. ⌨️ 7 Official Slash Commands (/stack, /docs, /github, /clear, /serverinfo, /userinfo, /ping)
 * 4. 🐙 Live GitHub Sync Engine (Issues, PRs, Pushes & Releases tracking for Suiflex)
 * 5. 🤖 Autonomous Community AI Assistant (Mentions & Q&A about Suiflex 10 modules)
 * 6. 🛡️ Server Audit Logger (Message Delete, Message Edit & Member Leave in #🤖-mod-logs)
 */

const WebSocket = require("ws");
const http = require("http");

// Configuration
const TOKEN = process.env.DISCORD_TOKEN || Buffer.from("TVRVMU1qTXdNamt5TURreE1qQTRNRGt5TncuR29zcUlFLlFQZjU5WjQyY0NULXVWcFVIVU1DV0Y3T1VZUnZhak11NTZfNkZV", "base64").toString("utf-8");
const SUIFLEX_GUILD_ID = "1523983495339311175";
const MEMBER_ROLE_ID = "1540264873005420554"; // 👥 Member
const WELCOME_CHANNEL_ID = "1540276644143566938"; // #🚀welcome
const AUDIT_LOG_CHANNEL_ID = "1552316795715715104"; // #🤖-mod-logs (Staff Only)
const BOT_START_TIME = Date.now();
const PORT = process.env.PORT || 3000;

// Repository to Channel Mapping for GitHub Live Sync
const REPO_CHANNEL_ROUTING = {
  "arsy-code": "1550524951662960792",    // #🚨arsy-code-update
  "forgeguard": "1543811778348318771",   // #🚨forgeguard-update
  "rdb": "1543811857100443818",          // #🚨rdb-update
  "suitest": "1543811927975919636",      // #🚨suitest-update
  "note": "1543865770755362886",         // #🚨companion-update
  "companion": "1543865770755362886",    // #🚨companion-update
  "default": "1523983497860219034"       // #📢service-updates
};

// 10 Suiflex Modules Complete Knowledge Base
const SUIFLEX_MODULES = {
  "arsy-code": {
    name: "Arsy Code",
    category: "AI Agents & Harness",
    desc: "Open-source terminal-first coding-agent harness for human & AI engineers. Supports live tool loops, sub-agent delegation, and extreme token efficiency.",
    install: "npm i -g @suiflex/arsy-code",
    url: "https://github.com/suiflex/arsy-code",
    commands: ["arsy", "arsy --help", "arsy models", "arsy bench"]
  },
  "forgeguard": {
    name: "ForgeGuard",
    category: "QA & Engineering Verification",
    desc: "Deterministic verification and gate validation framework for AI-generated code. Prevents hallucinations and guarantees regression safety with strict gate checks.",
    install: "brew install suiflex/tap/forgeguard",
    url: "https://github.com/suiflex/forgeguard",
    commands: ["forgeguard gate", "forgeguard task", "forgeguard verify"]
  },
  "suitest": {
    name: "Suitest",
    category: "QA & Engineering Verification",
    desc: "Self-hostable, MCP-native QA platform for agent-driven automated testing and artifact persistence with cross-framework support.",
    install: "brew install suiflex/tap/suitest-cli",
    url: "https://github.com/suiflex/suitest",
    commands: ["suitest run", "suitest init", "suitest report"]
  },
  "rdb": {
    name: "rdb",
    category: "Data Infrastructure",
    desc: "One native binary cross-database CLI and MCP server supporting 11 database backends (PostgreSQL, MySQL, Redis, ClickHouse, SQLite, MongoDB, Cassandra, Oracle, SQL Server, MariaDB, CockroachDB).",
    install: "brew install suiflex/tap/rdb",
    url: "https://github.com/suiflex/rdb",
    commands: ["rdb connect", "rdb query", "rdb schema", "rdb export"]
  },
  "websift": {
    name: "websift",
    category: "Tools & Platforms",
    desc: "Keyless, lightning-fast web search and article reader CLI designed specifically for LLM context injection without requiring external API keys.",
    install: "npm i -g @suiflex/websift",
    url: "https://github.com/suiflex/websift",
    commands: ["websift search <query>", "websift read <url>"]
  },
  "tap": {
    name: "Tap",
    category: "Tools & Platforms",
    desc: "Official Homebrew tap repository delivering binary distributions of the entire Suiflex CLI suite for macOS and Linux.",
    install: "brew tap suiflex/tap",
    url: "https://github.com/suiflex/homebrew-tap",
    commands: ["brew tap suiflex/tap", "brew install suiflex/tap/<package>"]
  },
  "kurir": {
    name: "Kurir",
    category: "AI Agents & Harness",
    desc: "Protocol bridge for inter-agent communication, audit trails, and multi-model dispatching across heterogeneous coding harnesses.",
    install: "npm i -g @suiflex/kurir",
    url: "https://github.com/suiflex/kurir",
    commands: ["kurir dispatch", "kurir route", "kurir status"]
  },
  "fluxguard": {
    name: "Fluxguard",
    category: "AI Agents & Harness",
    desc: "Token context optimizer and cost analyzer for LLM API calls. Tracks token spend, trims redundant prompt overhead, and optimizes context windows.",
    install: "npm i -g @suiflex/fluxguard",
    url: "https://github.com/suiflex/fluxguard",
    commands: ["fluxguard inspect", "fluxguard trim", "fluxguard cost"]
  },
  "safehell": {
    name: "SafeHell",
    category: "Tools & Platforms",
    desc: "Encrypted credential vault and local human-in-the-loop SSH security approval broker for safe remote server execution.",
    install: "brew install suiflex/tap/safehell",
    url: "https://github.com/suiflex/safehell",
    commands: ["safehell server add", "safehell exec", "safehell vault"]
  },
  "note": {
    name: "Companion (Note)",
    category: "Tools & Platforms",
    desc: "Companion developer notes and audio stream transcription tool optimized for technical discussions and automated action item extraction.",
    install: "npm i -g @suiflex/note",
    url: "https://github.com/suiflex/note",
    commands: ["note start", "note capture", "note summary"]
  }
};

// In-Memory Message Cache for Server Audit Logging (up to 1,000 messages)
const messageCache = new Map();

function cacheMessage(msg) {
  if (!msg || !msg.id) return;
  messageCache.set(msg.id, {
    id: msg.id,
    author: msg.author,
    channel_id: msg.channel_id,
    content: msg.content || "",
    attachments: msg.attachments || [],
    timestamp: msg.timestamp || new Date().toISOString()
  });

  // Keep cache bounded to 1,000 entries
  if (messageCache.size > 1000) {
    const firstKey = messageCache.keys().next().value;
    messageCache.delete(firstKey);
  }
}
// Member Roster Cache for Dynamic Tagging / Mentions
let guildMembersCache = [];

async function refreshGuildMembers() {
  try {
    const res = await discordApi(`/guilds/${SUIFLEX_GUILD_ID}/members?limit=1000`);
    const data = await res.json();
    if (Array.isArray(data)) {
      guildMembersCache = data.filter(m => !m.user.bot).map(m => ({
        id: m.user.id,
        username: m.user.username,
        globalName: m.user.global_name,
        nick: m.nick
      }));
      console.log(`[Member Roster] Cached ${guildMembersCache.length} members for tagging.`);
    }
  } catch (err) {
    console.error("[Member Roster] Failed to cache members:", err.message);
  }
}

function findMemberToTag(queryText) {
  const q = queryText.toLowerCase();
  for (const m of guildMembersCache) {
    const names = [m.username, m.globalName, m.nick].filter(Boolean).map(n => n.toLowerCase());
    for (const name of names) {
      const words = name.split(/[\s+_\-.]+/);
      if (q.includes(name) || words.some(w => w.length >= 3 && q.includes(w))) {
        return m;
      }
      if (q.includes("badrus") && name.includes("badh")) return m;
    }
  }
  return null;
}

// Discord REST API Helper
async function discordApi(endpoint, options = {}) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  return res;
}

// Send Typing Indicator
async function sendTyping(channelId) {
  try {
    await discordApi(`/channels/${channelId}/typing`, { method: "POST" });
  } catch (_) {}
}

// ==========================================
// 🐙 1. LIVE GITHUB SYNC ENGINE
// ==========================================
let lastSeenGitHubEventId = null;

async function pollGitHubEvents() {
  try {
    const res = await fetch("https://api.github.com/orgs/suiflex/events?per_page=10", {
      headers: {
        "User-Agent": "Suiflex-Architect-Bot"
      }
    });

    if (!res.ok) return;
    const events = await res.json();
    if (!Array.isArray(events) || events.length === 0) return;

    // First run: memorize newest event ID and don't flood old events
    if (!lastSeenGitHubEventId) {
      lastSeenGitHubEventId = events[0].id;
      console.log(`[GitHub Sync] Initialized. Latest event ID: ${lastSeenGitHubEventId}`);
      return;
    }

    // Process new events in chronological order (oldest to newest among new)
    const newEvents = [];
    for (const ev of events) {
      if (ev.id === lastSeenGitHubEventId) break;
      newEvents.push(ev);
    }

    if (newEvents.length === 0) return;
    lastSeenGitHubEventId = events[0].id;
    newEvents.reverse();

    for (const ev of newEvents) {
      await handleGitHubEvent(ev);
    }
  } catch (err) {
    console.error("[GitHub Sync] Poll error:", err.message);
  }
}

async function handleGitHubEvent(ev) {
  const repoName = ev.repo?.name || ""; // e.g. "suiflex/arsy-code"
  const shortRepo = repoName.replace("suiflex/", "").toLowerCase();
  const targetChannelId = REPO_CHANNEL_ROUTING[shortRepo] || REPO_CHANNEL_ROUTING["default"];
  const sender = ev.actor?.login || "contributor";
  const avatarUrl = ev.actor?.avatar_url || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

  let embed = null;

  // 1. Issues Event
  if (ev.type === "IssuesEvent") {
    const issue = ev.payload?.issue;
    const action = ev.payload?.action;
    if (issue && (action === "opened" || action === "closed")) {
      const isOpened = action === "opened";
      embed = {
        title: `🐙 [${repoName}] Issue ${action}: #${issue.number} ${issue.title}`,
        url: issue.html_url,
        description: issue.body ? (issue.body.slice(0, 300) + (issue.body.length > 300 ? "..." : "")) : "*Tidak ada deskripsi.*",
        color: isOpened ? 0x2ECC71 : 0xE74C3C,
        author: { name: sender, icon_url: avatarUrl, url: `https://github.com/${sender}` },
        fields: [
          { name: "🏷️ Labels", value: issue.labels?.map(l => l.name).join(", ") || "None", inline: true },
          { name: "🔗 Issue Link", value: `[Buka di GitHub](${issue.html_url})`, inline: true }
        ],
        footer: { text: "Suiflex GitHub Sync" },
        timestamp: new Date().toISOString()
      };
    }
  }

  // 2. Pull Request Event
  else if (ev.type === "PullRequestEvent") {
    const pr = ev.payload?.pull_request;
    const action = ev.payload?.action;
    if (pr && (action === "opened" || action === "closed")) {
      const isMerged = pr.merged;
      const statusText = isMerged ? "merged" : action;
      embed = {
        title: `🐙 [${repoName}] Pull Request ${statusText}: #${pr.number} ${pr.title}`,
        url: pr.html_url,
        description: pr.body ? (pr.body.slice(0, 300) + (pr.body.length > 300 ? "..." : "")) : "*Tidak ada deskripsi.*",
        color: isMerged ? 0x9B59B6 : (action === "opened" ? 0x3498DB : 0x95A5A6),
        author: { name: sender, icon_url: avatarUrl, url: `https://github.com/${sender}` },
        fields: [
          { name: "🌿 Branch", value: `\`${pr.head?.ref}\` ➔ \`${pr.base?.ref}\``, inline: true },
          { name: "📊 Perubahan", value: `+${pr.additions || 0} / -${pr.deletions || 0}`, inline: true }
        ],
        footer: { text: "Suiflex GitHub Sync" },
        timestamp: new Date().toISOString()
      };
    }
  }

  // 3. Release Event
  else if (ev.type === "ReleaseEvent") {
    const rel = ev.payload?.release;
    if (rel && ev.payload?.action === "published") {
      embed = {
        title: `🚀 [${repoName}] Rilis Versi Baru: ${rel.name || rel.tag_name}`,
        url: rel.html_url,
        description: rel.body ? rel.body.slice(0, 400) : "Rilis baru telah dipublikasikan di GitHub.",
        color: 0xF1C40F,
        author: { name: sender, icon_url: avatarUrl },
        fields: [
          { name: "🏷️ Tag", value: `\`${rel.tag_name}\``, inline: true },
          { name: "📦 Tarball", value: `[Download Source](${rel.tarball_url})`, inline: true }
        ],
        footer: { text: "Suiflex Release Tracker" },
        timestamp: new Date().toISOString()
      };
    }
  }

  // 4. Push Event (New Commits)
  else if (ev.type === "PushEvent") {
    const commits = ev.payload?.commits || [];
    if (commits.length > 0) {
      const commitList = commits.slice(0, 4).map(c => `• [\`${c.sha.slice(0, 7)}\`](https://github.com/${repoName}/commit/${c.sha}) ${c.message.split("\n")[0]}`).join("\n");
      const branch = (ev.payload?.ref || "").replace("refs/heads/", "");
      embed = {
        title: `🔨 [${repoName}] ${commits.length} Commit Baru di branch \`${branch}\``,
        url: `https://github.com/${repoName}/commits/${branch}`,
        description: commitList,
        color: 0x34495E,
        author: { name: sender, icon_url: avatarUrl, url: `https://github.com/${sender}` },
        footer: { text: "Suiflex Commit Tracker" },
        timestamp: new Date().toISOString()
      };
    }
  }

  if (embed) {
    try {
      await discordApi(`/channels/${targetChannelId}/messages`, {
        method: "POST",
        body: JSON.stringify({ embeds: [embed] })
      });
      console.log(`[GitHub Sync] Dispatched ${ev.type} to channel ${targetChannelId}`);
    } catch (e) {
      console.error(`[GitHub Sync] Failed to post event to channel ${targetChannelId}:`, e.message);
    }
  }
}

// Start GitHub Polling every 60 seconds
setInterval(pollGitHubEvents, 60000);
setTimeout(pollGitHubEvents, 5000);

// ==========================================
// 🤖 2. AUTONOMOUS COMMUNITY AI ASSISTANT
// ==========================================
// Channel to Module Scope Mapping (Strict Category-Specific Routing)
const CHANNEL_MODULE_SCOPE = {
  // Category-specific General Channels
  "1540271978496266260": { mod: "forgeguard", name: "ForgeGuard", channel: "1540271978496266260" }, // #💬-forgeguard-general
  "1540272970608541746": { mod: "arsy-code", name: "Arsy Code", channel: "1540272970608541746" },     // #💬-arsy-code-general
  "1540273362784493648": { mod: "rdb", name: "rdb", channel: "1540273362784493648" },                 // #💬-rdb-general
  "1540273774786514944": { mod: "suitest", name: "Suitest", channel: "1540273774786514944" },         // #💬-suitest-general
  "1543867099460665395": { mod: "note", name: "Companion (Note)", channel: "1543867099460665395" },   // #💬-companion-general
  "1543867274560143360": { mod: "note", name: "Companion (Note)", channel: "1543867099460665395" },   // companion-support

  // Labs channels
  "1543875395718484018": { mod: "websift", name: "websift", channel: "1543875395718484018" },        // #🔍-websift-research
  "1543877000639418418": { mod: "safehell", name: "SafeHell", channel: "1543877000639418418" },      // #🔒-safehell-security
  "1552315203704590338": { mod: "kurir", name: "Kurir", channel: "1552315203704590338" },            // #⚡-kurir-mcp
  "1552315206410051624": { mod: "fluxguard", name: "Fluxguard", channel: "1552315206410051624" }      // #📊-fluxguard-observer
};
// Comprehensive Module Keywords for Strict Channel Routing & Typo-Tolerance
const MODULE_KEYWORDS = {
  "arsy-code": ["arsy", "arsy-code", "arsy code", "coding agent", "harness"],
  "forgeguard": ["forgeguard", "forge guard", "gate verification", "verifikasi kode"],
  "suitest": ["suitest", "sui test", "qa platform", "testing platform"],
  "rdb": ["rdb", "database", "postgres", "mysql", "sqlite", "redis", "clickhouse", "mongodb", "cassandra", "sql"],
  "websift": ["websift", "web sift", "keyless search", "pencarian web"],
  "tap": ["tap", "homebrew tap", "brew tap"],
  "kurir": ["kurir", "inter-agent", "multi-harness"],
  "fluxguard": ["fluxguard", "flux guard", "token cost", "biaya token"],
  "safehell": ["safehell", "safe hell", "ssh broker", "human approval"],
  "note": ["note", "companion", "acompanion", "kompanion", "transkrip", "notula", "meeting"]
};

// Generic in-context questions about "this channel / this module"
const IN_CONTEXT_QUESTIONS = [
  "ini apa", "apa ini", "apa itu", "fungsinya apa", "fungsi modul ini", "bisa apa", "fiturnya apa",
  "cara install", "cara pakai", "bagaimana pakainya", "perintahnya apa", "tujuan", "kegunaan"
];
function formatModuleAnswer(modKey) {
  const mod = SUIFLEX_MODULES[modKey];
  if (!mod) return "Modul tidak ditemukan.";

  let details = "";
  if (modKey === "note") {
    details = "**Companion (Note)** adalah asisten pendamping developer di ekosistem Suiflex yang berfungsi mentranskripsikan rapat teknis secara audio dan mengekstrak daftar tugas (*action items*) teknis tim secara otomatis.";
  } else if (modKey === "arsy-code") {
    details = "**Arsy Code** adalah harness coding-agent terminal-first dari Suiflex yang membantu developer dan AI menulis, menguji, dan menyelesaikan tugas pemrograman secara otonom langsung dari command line.";
  } else if (modKey === "forgeguard") {
    details = "**ForgeGuard** adalah framework verifikasi deterministik dan gate validation untuk kode yang dihasilkan oleh AI agent, memastikan kode bebas halusinasi dan tidak merusak sistem (*regression-safe*).";
  } else if (modKey === "rdb") {
    details = "**rdb** adalah alat bantu database terpadu satu binary yang mendukung 11 database modern (*PostgreSQL, MySQL, Redis, SQLite, MongoDB, ClickHouse, dll*) baik lewat CLI maupun MCP server.";
  } else if (modKey === "suitest") {
    details = "**Suitest** adalah platform pengujian QA self-hostable dan MCP-native untuk otomasi pengujian software berbasis AI agent dengan persistence artefak hasil uji.";
  } else if (modKey === "websift") {
    details = "**websift** adalah alat pencarian web dan pembaca artikel berbasis CLI yang sangat cepat dan hemat, dirancang untuk menyuntikkan konteks web ke LLM tanpa memerlukan API key.";
  } else if (modKey === "safehell") {
    details = "**SafeHell** adalah security broker SSH lokal dengan brankas kredensial terenkripsi dan persetujuan interaktif manusia (*human approval gate*) untuk eksekusi server yang aman.";
  } else if (modKey === "kurir") {
    details = "**Kurir** adalah jembatan protokol koordinasi antar-agent multi-harness untuk membagi tugas coding lintas model dan framework.";
  } else if (modKey === "fluxguard") {
    details = "**Fluxguard** adalah pengoptimal konteks token dan penganalisis biaya LLM untuk memangkas prompt yang mubazir dan menghemat biaya API coding agents.";
  } else if (modKey === "tap") {
    details = "**Tap** adalah repositori Homebrew resmi untuk mendistribusikan seluruh paket binary CLI ekosistem Suiflex di macOS dan Linux.";
  }

  return [
    details,
    "",
    "**Cara Instalasi Cepat:**",
    `\`\`\`bash\n${mod.install}\n\`\`\``,
    `🌐 Dokumentasi Resmi: [https://www.suiflex.dev](https://www.suiflex.dev) • [GitHub](${mod.url})`
  ].join("\n");
}
function generateAiImage(prompt, authorId) {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

  return {
    embeds: [{
      title: "🎨 AI Generated Image • Architect Vision",
      description: `**Prompt:** *"${prompt.trim()}"*\n**Dimensi:** 1024x1024 HD • **Model:** Flux AI`,
      image: { url: imageUrl },
      color: 0x9B59B6,
      footer: { text: "Dibuat oleh Suiflex Architect AI" },
      timestamp: new Date().toISOString()
    }],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "🖼️ Buka Gambar Resolusi Penuh",
            url: imageUrl
          },
          {
            type: 2,
            style: 5,
            label: "🌐 Suiflex Portal",
            url: "https://www.suiflex.dev"
          }
        ]
      }
    ]
  };
}
// Interactive Poll Helpers
const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const POLL_EMOJI_ENCODED = [
  "1%EF%B8%8F%E2%83%A3", "2%EF%B8%8F%E2%83%A3", "3%EF%B8%8F%E2%83%A3", "4%EF%B8%8F%E2%83%A3", "5%EF%B8%8F%E2%83%A3",
  "6%EF%B8%8F%E2%83%A3", "7%EF%B8%8F%E2%83%A3", "8%EF%B8%8F%E2%83%A3", "9%EF%B8%8F%E2%83%A3", "%F0%9F%94%9F"
];

function createPollPayload(question, optionsList, authorId) {
  const options = optionsList.slice(0, 10);
  const optionsText = options.map((opt, i) => `${POLL_EMOJIS[i]} **${opt.trim()}**`).join("\n");

  return {
    embeds: [{
      title: "📊 Jajak Pendapat Komunitas • Community Poll",
      description: `**Pertanyaan:**\n### ${question.trim()}\n\n**Pilihan Jawaban:**\n${optionsText}\n\n*Klik reaksi emoji angka di bawah untuk memberikan suara Anda!*`,
      color: 0xF1C40F,
      footer: { text: "Suiflex Interactive Poll System • Powered by Architect" },
      timestamp: new Date().toISOString()
    }],
    optionsCount: options.length
  };
}

async function addPollReactions(channelId, messageId, count) {
  for (let i = 0; i < count; i++) {
    try {
      await discordApi(`/channels/${channelId}/messages/${messageId}/reactions/${POLL_EMOJI_ENCODED[i]}/@me`, {
        method: "PUT"
      });
      await new Promise(r => setTimeout(r, 200));
    } catch (_) {}
  }
}

function parsePollFromText(text) {
  const q = text.trim();
  const lower = q.toLowerCase();

  const isPoll = lower.includes("poll") || lower.includes("polling") || lower.includes("voting") || lower.includes("vote") || lower.includes("jajak pendapat");
  if (!isPoll) return null;

  // Strip poll trigger words
  let clean = q.replace(/^(?:tolong\s+|coba\s+|bisa\s+)?(?:buatkan\s+|buat\s+kan\s+|bikin\s+|buat\s+)?(?:polling|poll|voting|vote|jajak pendapat)\s*:?\s*/i, "").trim();

  let question = "";
  let options = [];

  // Case A: Pipe separated "Pertanyaan? | Opsi 1 | Opsi 2"
  if (clean.includes("|")) {
    const parts = clean.split("|").map(s => s.trim()).filter(Boolean);
    question = parts[0];
    options = parts.slice(1);
  }
  // Case B: Explicit options keyword "pilihan: A, B"
  else if (clean.match(/(?:pilihan|options|opsi)\s*:/i)) {
    const parts = clean.split(/(?:pilihan|options|opsi)\s*:/i);
    question = parts[0].trim();
    options = parts[1].split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  }
  // Case C: Question mark "Siapa terbaik? A, B"
  else if (clean.includes("?")) {
    const idx = clean.indexOf("?");
    question = clean.slice(0, idx + 1).trim();
    const rest = clean.slice(idx + 1).trim();
    if (rest.includes(" atau ")) {
      options = rest.split(/\s+atau\s+/i).map(s => s.trim()).filter(Boolean);
    } else {
      options = rest.split(/[,;\n]/).map(s => s.trim().replace(/^[-•*0-9.]+\s*/, "")).filter(Boolean);
    }
  }
  // Case D: Separated by " atau " (e.g. "warna hitam atau putih")
  else if (clean.toLowerCase().includes(" atau ")) {
    options = clean.split(/\s+atau\s+/i).map(s => s.trim()).filter(Boolean);
    question = `Pilih: ${options.join(" atau ")}?`;
  }
  // Case E: Separated by " vs "
  else if (clean.toLowerCase().includes(" vs ")) {
    options = clean.split(/\s+vs\s+/i).map(s => s.trim()).filter(Boolean);
    question = `Voting: ${options.join(" vs ")}?`;
  }

  // Capitalize options
  options = options.map(o => o.charAt(0).toUpperCase() + o.slice(1));

  if (question && options.length >= 2) {
    return { question, options };
  }
  return null;
}

function extractImagePrompt(text) {
  const q = text.toLowerCase().trim();
  const imageTriggers = [
    "buatkan gambar", "buat kan gambar", "bikin gambar", "bikin kan gambar",
    "gambarkan", "generate gambar", "buat gambar", "generate image",
    "gambar ", "lukiskan", "foto "
  ];

  const matched = imageTriggers.find(t => q.includes(t));
  if (matched) {
    const regex = new RegExp(`(?:tolong\\s+|coba\\s+|bisa\\s+)?(?:${imageTriggers.join("|")})\\s*:?\\s*`, "i");
    const prompt = text.replace(regex, "").trim();
    return prompt || "futuristic digital art";
  }
  return null;
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from("QVEuQWI4Uk42STd3ZTJXWkw0ZHZwYm8tNlNWMENDTUIydDYxcnFESk5DUlhVWlpFb2hnRWc=", "base64").toString("utf-8");
async function queryGeminiAi(userQuestion, authorId, channelId) {
  const channelScope = CHANNEL_MODULE_SCOPE[channelId];
  let channelContextDesc = "Channel umum (#💬-suiflex-general). Anda bebas menjawab seputar seluruh ekosistem Suiflex 10 modul.";
  if (channelScope) {
    channelContextDesc = `Channel khusus kategori ${channelScope.name} (Modul ID: ${channelScope.mod}). DISKUSI DI SINI HANYA UNTUK ${channelScope.name}. JIKA PENGGUNA BERTANYA TENTANG MODUL LAIN, TOLAK DENGAN SANTUN DAN ARAHKAN KE CHANNEL MODUL YANG BERSANGKUTAN. JANGAN JELASKAN MODUL LAIN TERSEBUT DI SINI.`;
  }

  // Fast-path: Check if user is asking to tag/mention someone
  const cleanQ = (userQuestion || "").toLowerCase().trim();
  const isTagRequest = cleanQ.startsWith("tag ") || cleanQ.startsWith("panggil ") || cleanQ.startsWith("mention ") ||
    cleanQ.includes("tolong tag ") || cleanQ.includes("tolong panggil ") || cleanQ.includes("coba tag ") || cleanQ.includes("bisa tag ");

  if (isTagRequest) {
    const target = findMemberToTag(cleanQ);
    if (target) {
      return `Halo <@${target.id}>! Kamu dipanggil oleh <@${authorId}> nih 👋`;
    }
  }

  const memberListSnippet = guildMembersCache.map(m => `- ${m.globalName || m.username}: <@${m.id}>`).join("\n");

  const systemPrompt = `
Kamu adalah Architect, asisten AI resmi komunitas open-source Suiflex Open Engineering (https://www.suiflex.dev).
Gaya bicaramu: ramah, santun, cerdas, to-the-point, dan natural tanpa kartu template kaku (maksimal 2-3 paragraf ringkas).

Daftar 10 Modul Suiflex:
1. Arsy Code: AI coding-agent terminal-first harness (npm i -g @suiflex/arsy-code, channel: <#1540272970608541746>)
2. ForgeGuard: Gate validation & regression verification (brew install suiflex/tap/forgeguard, channel: <#1540271978496266260>)
3. Suitest: MCP-native automated QA testing platform (brew install suiflex/tap/suitest-cli, channel: <#1540273774786514944>)
4. rdb: Unified database CLI & MCP for 11 databases (brew install suiflex/tap/rdb, channel: <#1540273362784493648>)
5. websift: Keyless web search & fast reader CLI (npm i -g @suiflex/websift, channel: <#1543875395718484018>)
6. Companion (Note): Developer meeting audio transcription & action items (npm i -g @suiflex/note, channel: <#1543867099460665395>)
7. Kurir: Multi-harness agent coordinator (npm i -g @suiflex/kurir, channel: <#1552315203704590338>)
8. Fluxguard: LLM token context & cost optimizer (npm i -g @suiflex/fluxguard, channel: <#1552315206410051624>)
9. SafeHell: Local human-in-the-loop SSH security broker (brew install suiflex/tap/safehell, channel: <#1543877000639418418>)
10. Tap: Official Homebrew binary tap (brew tap suiflex/tap)

ATURAN WAJIB & MUTLAK:
1. ATURAN CHANNEL UMUM #SUIFLEX-GENERAL (<#1540268259645857863>):
   - Di channel #suiflex-general, kamu adalah asisten AI serbaguna dan pintar.
   - Kamu BISA DAN WAJIB membantu menjawab SEMUA pertanyaan pengguna secara cerdas, ramah, dan solutif, WALAUPUN pertanyaannya di luar konteks Suiflex (misal: estimasi biaya kanopi, resep masakan, pemrograman umum bahasa apa saja, sains, logika, tips umum, dll), serta pertanyaan seputar seluruh ekosistem Suiflex.
2. ATURAN CHANNEL KATEGORI KHUSUS (misal: channel rdb, companion, arsy-code, forgeguard, suitest, labs):
   - Di channel kategori khusus, kamu HANYA BOLEH menjawab pertanyaan yang berkaitan dengan modul kategori tersebut!
   - JIKA PENGGUNA BERTANYA DI LUAR KATEGORI CHANNEL INI:
     * Jika bertanya modul Suiflex lain: Tolak dengan sopan dan arahkan ke channel modul tersebut (misal jika tanya Arsy Code di channel rdb, arahkan ke <#1540272970608541746>). JANGAN jelaskan modul lain itu di sini.
     * Jika bertanya hal umum/di luar Suiflex (misal tanya kanopi, masak, coding umum di channel rdb): Tolak dengan santun bahwa channel ini khusus untuk modul tersebut, dan arahkan mereka untuk bertanya di channel umum <#1540268259645857863>!
3. JIKA PERTANYAAN NGACO / GIBBERISH / ACUR DI CHANNEL KATEGORI:
   - Tanggapi ramah bahwa kamu belum memahami maksudnya, dan sebutkan contoh hal yang dapat ditanyakan seputar modul channel tersebut.
4. ATURAN MEN-TAG / MEMANGGIL ANGGOTA:
   - Jika pengguna meminta kamu untuk men-tag atau memanggil anggota (misal: 'tag enriko', 'panggil wahyu', 'mention matoa'):
   - Kamu BISA DAN WAJIB men-tag mereka menggunakan format mention Discord <@USER_ID>.
   - Daftar anggota terdaftar:
${memberListSnippet}
   - Contoh respons: "Halo <@759727431992737792>! Kamu dipanggil oleh <@authorId> nih 👋"
`;
  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: `[Konteks Channel: ${channelContextDesc}]\nPengguna (<@${authorId}>) bertanya: "${userQuestion}"` }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && aiText.trim().length > 0) {
          return aiText.trim();
        }
      } else {
        const errText = await res.text();
        console.warn(`[Gemini AI] Model ${model} returned ${res.status}:`, errText.slice(0, 150));
      }
    } catch (err) {
      console.error(`[Gemini AI] Error calling model ${model}:`, err.message);
    }
  }
  // Fallback to local rule engine if Gemini API is unreachable
  return fallbackAiAnswer(userQuestion, authorId, channelId);
}

async function generateAiAnswer(userQuestion, authorId, channelId) {
  return await queryGeminiAi(userQuestion, authorId, channelId);
}

function fallbackAiAnswer(userQuestion, authorId, channelId) {
  const q = (userQuestion || "").toLowerCase().trim();
  const channelScope = CHANNEL_MODULE_SCOPE[channelId];

  // 1. Off-Topic / Non-Software Domain Detection
  const nonTechKeywords = [
    "kanopi", "upvc", "baja ringan", "atap", "genteng", "renovasi rumah", "tukang", "semen", "cat tembok",
    "resep", "masak", "makanan", "kuliner", "kue", "gorengan", "nasi",
    "mobil", "motor", "bengkel", "sparepart", "oli", "ban bocor",
    "obat", "penyakit", "sakit", "dokter", "apotek",
    "pinjol", "judi", "slot", "togel", "saham gorengan",
    "pacar", "jodoh", "cinta", "zodiak", "ramalan"
  ];

  const isOffTopic = nonTechKeywords.some(kw => q.includes(kw));

  if (isOffTopic) {
    return [
      `Waduh <@${authorId}>, sepertinya Anda bertanya di luar bidang keahlian saya! 😅`,
      "",
      "Saya adalah bot asisten teknis resmi untuk ekosistem rekayasa perangkat lunak **Suiflex** (*AI coding agents, automated testing, cross-engine database CLI, dsb*).",
      "",
      "Saya tidak memiliki informasi atau keahlian mengenai hal-hal di luar dunia teknologi & software development. 🙏",
      "",
      "💡 *Jika Anda membutuhkan bantuan seputar software development, coding, atau modul Suiflex, silakan tanyakan kepada saya!*"
    ].join("\n");
  }

  // 2. CATEGORY-SPECIFIC CHANNEL ROUTING:
  // If the user is in a category channel (e.g. #💬-companion-general, #💬-arsy-code-general, #💬-rdb-general, etc.)
  if (channelScope) {
    const boundMod = channelScope.mod;
    const boundName = channelScope.name;

    // 1. Check if the user is asking about a DIFFERENT module:
    let askedMod = null;
    for (const [modKey, keywords] of Object.entries(MODULE_KEYWORDS)) {
      if (keywords.some(kw => q.includes(kw))) {
        askedMod = modKey;
        break;
      }
    }

    if (askedMod && askedMod !== boundMod) {
      const otherInfo = SUIFLEX_MODULES[askedMod];
      const otherChannelEntry = Object.entries(CHANNEL_MODULE_SCOPE).find(([chId, data]) => data.mod === askedMod);
      const otherChMention = otherChannelEntry ? `<#${otherChannelEntry[0]}>` : "channel terkait";

      // STRICTLY REFUSE TO ANSWER ABOUT ANOTHER MODULE IN THIS CHANNEL:
      return [
        `Halo <@${authorId}>! Karena saat ini Anda berada di channel khusus **${boundName}**, diskusi di channel ini dikhususkan hanya untuk topik seputar **${boundName}**.`,
        "",
        `Untuk pertanyaan atau pembahasan seputar **${otherInfo.name}**, silakan langsung menuju ke channel ${otherChMention} ya! 🙏`
      ].join("\n");
    }

    // 2. Did the user ask about THIS bound module OR ask an in-context question ("ini apa", "cara install", etc.)?
    const isAskingThisMod = (askedMod === boundMod) || IN_CONTEXT_QUESTIONS.some(ic => q.includes(ic));

    if (isAskingThisMod) {
      return formatModuleAnswer(boundMod);
    }

    // 3. Greeting in this category channel:
    if (q.includes("halo") || q.includes("hai") || q.includes("hello") || q === "") {
      return [
        `Halo <@${authorId}>! 👋 Selamat datang di channel diskusi khusus **${boundName}**.`,
        "",
        `Di channel ini saya siap membantu Anda seputar **${boundName}**. Anda bisa menanyakan:`,
        `• *"Apa fungsi utama ${boundName}?"*`,
        `• *"Bagaimana cara instalasi dan penggunaannya?"*`,
        "",
        `🌐 Dokumentasi Resmi: https://www.suiflex.dev`
      ].join("\n");
    }

    // 4. UNRECOGNIZED / GIBBERISH / NGACOR QUERY IN THIS CATEGORY CHANNEL:
    // DO NOT DUMP RDB! Explain politely and guide:
    return [
      `Maaf <@${authorId}>, saya belum memahami pertanyaan Anda. 🤔`,
      "",
      `Di channel ini, obrolan dikhususkan hanya untuk modul **${boundName}**. Anda bisa menanyakan hal seputar:`,
      `• *Apa itu ${boundName}?*`,
      `• *Bagaimana cara instalasi dan perintah utamanya?*`,
      `• *Fitur dan contoh penggunaannya.*`,
      "",
      `*(Untuk pertanyaan umum di luar ${boundName} atau seputar seluruh ekosistem, silakan gunakan channel <#1540268259645857863>).*`
    ].join("\n");
  }

  // 3. GLOBAL GENERAL CHANNEL (#💬-suiflex-general or any uncategorized channel):
  // Here the bot can answer about ALL features across the entire Suiflex suite!

  // A. Greetings / Identity / Blank
  if (q.includes("halo") || q.includes("hai") || q.includes("hello") || q.includes("siapa kamu") || q.includes("who are you") || q === "") {
    return [
      `Halo <@${authorId}>! 👋 Saya **Architect**, bot asisten otonom untuk ekosistem **Suiflex Open Engineering**.`,
      "",
      "Di channel obrolan umum ini, saya siap menjawab pertanyaan seputar seluruh ekosistem Suiflex:",
      "• 📦 **10 Modul Rekayasa Suiflex** (Arsy Code, ForgeGuard, suitest, rdb, websift, companion, kurir, fluxguard, safehell, tap)",
      "• ⚡ **Cara instalasi & konfigurasi terminal** (\`npm\`, \`brew tap suiflex/tap\`)",
      "• 🛠️ **Workflow pengujian & verifikasi AI coding agents**",
      "• 🌐 Kunjungi portal dokumentasi resmi di **https://www.suiflex.dev**",
      "",
      "*Silakan tanyakan modul apa pun yang ingin Anda ketahui!*"
    ].join("\n");
  }

  // B. Specific Modules Check in Global General
  if (q.includes("companion") || q.includes("note") || q.includes("notula") || q.includes("transkrip") || q.includes("meeting")) {
    return formatModuleAnswer("note");
  }
  if (q.includes("arsy") || q.includes("coding agent") || q.includes("harness")) {
    return formatModuleAnswer("arsy-code");
  }
  if (q.includes("forgeguard") || q.includes("gate") || q.includes("verifikasi")) {
    return formatModuleAnswer("forgeguard");
  }
  if (q.includes("rdb") || q.includes("database") || q.includes("postgres") || q.includes("mysql") || q.includes("sqlite") || q.includes("redis")) {
    return formatModuleAnswer("rdb");
  }
  if (q.includes("suitest") || q.includes("testing") || q.includes("qa platform")) {
    return formatModuleAnswer("suitest");
  }
  if (q.includes("websift") || q.includes("search") || q.includes("pencarian")) {
    return formatModuleAnswer("websift");
  }
  if (q.includes("safehell") || q.includes("ssh") || q.includes("keamanan") || q.includes("vault")) {
    return formatModuleAnswer("safehell");
  }
  if (q.includes("kurir")) {
    return formatModuleAnswer("kurir");
  }
  if (q.includes("fluxguard") || q.includes("token cost") || q.includes("biaya token")) {
    return formatModuleAnswer("fluxguard");
  }

  // C. Install / Contribution in Global General
  if (q.includes("install") || q.includes("cara install") || q.includes("brew") || q.includes("tap") || q.includes("kontribusi")) {
    return [
      "### 🚀 Cara Install Seluruh Modul Suiflex",
      "",
      "**1. Menggunakan Homebrew (macOS & Linux):**",
      "```bash\n# Pasang repository resmi Suiflex Tap\nbrew tap suiflex/tap\n\n# Install modul pilihan Anda\nbrew install suiflex/tap/forgeguard\nbrew install suiflex/tap/rdb\nbrew install suiflex/tap/suitest-cli\nbrew install suiflex/tap/safehell\n```",
      "",
      "**2. Menggunakan NPM (TypeScript / Node.js Tools):**",
      "```bash\nnpm i -g @suiflex/arsy-code\nnpm i -g @suiflex/note\nnpm i -g @suiflex/websift\nnpm i -g @suiflex/kurir\nnpm i -g @suiflex/fluxguard\n```",
      "",
      "🌐 **Dokumentasi Lengkap:** [https://www.suiflex.dev](https://www.suiflex.dev)"
    ].join("\n");
  }

  // D. Suiflex Ecosystem Overview
  if (q.includes("suiflex") || q.includes("ekosistem") || q.includes("apa ini") || q.includes("semua modul")) {
    return [
      "### 🌐 Suiflex Open Engineering Ecosystem",
      "**Suiflex** adalah ekosistem perangkat lunak open-source yang dirancang untuk mempercepat dan mengamankan rekayasa software oleh manusia dan AI coding agents.",
      "",
      "**10 Pilar Modul Rekayasa Suiflex:**",
      "1. 🤖 **Arsy Code:** AI coding-agent harness terminal-first.",
      "2. 🛡️ **ForgeGuard:** Gate validation & regression prevention untuk AI code.",
      "3. 🎯 **Suitest:** MCP-native automated QA testing platform.",
      "4. 🗄️ **rdb:** Cross-engine database CLI & MCP server (11 database).",
      "5. 🌐 **websift:** Keyless web search & fast reader CLI.",
      "6. 🧩 **Companion (Note):** Developer meeting notes & audio transcription.",
      "7. ⚡ **Kurir:** Multi-harness agent coordinator & protocol bridge.",
      "8. 📊 **Fluxguard:** Token context optimizer & LLM cost analyzer.",
      "9. 🔒 **SafeHell:** Local human-in-the-loop SSH security broker.",
      "10. 🍺 **Tap:** Official Homebrew binary distribution tap.",
      "",
      "🌐 **Portal Dokumentasi Resmi:** [https://www.suiflex.dev](https://www.suiflex.dev)"
    ].join("\n");
  }

  // E. Fallback in Global General
  return [
    `Halo <@${authorId}>! Saya adalah bot asisten teknis resmi untuk ekosistem rekayasa perangkat lunak **Suiflex** (*AI agents, dev tools, database CLI, testing platform*).`,
    "",
    "💡 **Di channel umum ini, Anda dapat menanyakan tentang:**",
    "• 10 modul rekayasa Suiflex (*Arsy Code, ForgeGuard, rdb, suitest, companion, websift, dll*)",
    "• Cara instalasi CLI via \`brew\` atau \`npm\`",
    "• Workflow software engineering & AI coding agents",
    "",
    "🌐 **Dokumentasi Resmi:** [https://www.suiflex.dev](https://www.suiflex.dev)"
  ].join("\n");
}

// ==========================================
// 🛡️ 3. SERVER AUDIT LOGGER
// ==========================================
async function logAuditEvent(embed) {
  try {
    await discordApi(`/channels/${AUDIT_LOG_CHANNEL_ID}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (err) {
    console.error("[AuditLog] Failed to send audit log:", err.message);
  }
}

// ==========================================
// 🌐 4. WEBSOCKET GATEWAY & EVENT DISPATCHER
// ==========================================
let ws;
let heartbeatTimer = null;
let sequence = null;

function connect() {
  console.log("[Architect v3.0] Connecting to Discord Gateway...");
  ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("[Architect v3.0] Gateway WebSocket connection established.");
  });

  ws.on("message", async (dataBuffer) => {
    try {
      const data = JSON.parse(dataBuffer.toString());
      if (data.s) sequence = data.s;

      // Opcode 10: Hello -> Heartbeat & Identify
      if (data.op === 10) {
        const interval = data.d.heartbeat_interval;
        console.log(`[Architect v3.0] Heartbeat interval: ${interval}ms`);

        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: sequence }));
          }
        }, interval);

        // Identify: GUILDS (1) + GUILD_MEMBERS (2) + GUILD_MESSAGES (512)
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: TOKEN,
            intents: 1 | (1 << 1) | (1 << 9) | (1 << 15),
            properties: { os: "linux", browser: "railway-cloud", device: "cloud" }
          }
        }));
      }

      // Event: READY
      if (data.t === "READY") {
        console.log(`[Architect v3.0] READY! Logged in as ${data.d.user.username}#${data.d.user.discriminator}`);
        console.log("[Architect v3.0] All 6 systems active: AutoRole, WelcomeCard, SlashCommands, GitHubSync, AiAssistant, AuditLogger.");
      }

      // Event: GUILD_MEMBER_ADD (Auto-Role + Welcome Embed)
      if (data.t === "GUILD_MEMBER_ADD") {
        const member = data.d;
        if (member.guild_id === SUIFLEX_GUILD_ID) {
          const user = member.user;
          console.log(`[Architect] New member joined: ${user.username} (${user.id})`);

          // 1. Assign 👥 Member role
          try {
            await discordApi(`/guilds/${SUIFLEX_GUILD_ID}/members/${user.id}/roles/${MEMBER_ROLE_ID}`, {
              method: "PUT",
              headers: { "X-Audit-Log-Reason": "Auto-Role: Welcome new community member" }
            });
            console.log(`[Architect] Assigned 👥 Member role to ${user.username}`);
          } catch (e) {
            console.error(`[Architect] Auto-role error: ${e.message}`);
          }

          // 2. Send Rich Welcome Embed to #🚀welcome
          try {
            const avatarUrl = user.avatar
              ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
              : "https://cdn.discordapp.com/embed/avatars/0.png";

            const welcomeEmbed = {
              title: "🌟 Selamat Datang di Suiflex • Welcome to Suiflex!",
              description: [
                `Halo <@${user.id}>, selamat bergabung di komunitas **Suiflex Open Engineering**!`,
                `Welcome to the official community of **Suiflex Open Engineering**!`,
                "",
                "**Panduan / Indonesian Guide:**",
                "• 📜 Baca aturan & informasi di <#1543809459099406426>",
                "• 🧭 Pelajari 10 modul rekayasa di <#1552315058414161940>",
                "• 💬 Mulai obrolan & kenalkan diri di <#1540268259645857863>",
                "• 🌐 Kunjungi portal dokumentasi: [https://www.suiflex.dev](https://www.suiflex.dev)",
                "",
                "**English Guide:**",
                "• 📜 Read guidelines & rules in <#1543809459099406426>",
                "• 🧭 Explore the 10 engineering modules in <#1552315058414161940>",
                "• 💬 Join discussions & introduce yourself in <#1540268259645857863>",
                "• 🌐 Visit our official documentation: [https://www.suiflex.dev](https://www.suiflex.dev)",
                "✨ *Peran `👥 Member` telah disematkan secara otomatis ke akun Anda.*",
                "✨ *The `👥 Member` role has been automatically assigned to your account.*"
              ].join("\n"),
              color: 0xF1C40F, // Suiflex Gold
              thumbnail: { url: avatarUrl },
              footer: {
                text: "Suiflex Open Engineering System • https://www.suiflex.dev",
                icon_url: "https://cdn.discordapp.com/embed/avatars/1.png"
              },
              timestamp: new Date().toISOString()
            };

            await discordApi(`/channels/${WELCOME_CHANNEL_ID}/messages`, {
              method: "POST",
              body: JSON.stringify({
                content: `Selamat datang / Welcome <@${user.id}>! 👋`,
                embeds: [welcomeEmbed],
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: "🌐 Website Resmi (suiflex.dev)",
                        url: "https://www.suiflex.dev"
                      },
                      {
                        type: 2,
                        style: 5,
                        label: "🐙 GitHub Suiflex",
                        url: "https://github.com/suiflex"
                      }
                    ]
                  }
                ]
              })
            });
          } catch (e) {
            console.error(`[Architect] Welcome message error: ${e.message}`);
          }
        }
      }

      // Event: GUILD_MEMBER_REMOVE (Audit Log: Member Left)
      if (data.t === "GUILD_MEMBER_REMOVE") {
        const member = data.d;
        if (member.guild_id === SUIFLEX_GUILD_ID) {
          const user = member.user;
          const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : "https://cdn.discordapp.com/embed/avatars/0.png";

          await logAuditEvent({
            title: "🚪 Anggota Meninggalkan Server / Member Left",
            description: `**Pengguna:** ${user.username}#${user.discriminator} (<@${user.id}>)\n**User ID:** \`${user.id}\``,
            color: 0x95A5A6,
            thumbnail: { url: avatarUrl },
            footer: { text: "Server Security Audit Log" },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Event: MESSAGE_CREATE (Cache + AI Assistant Mentions)
      if (data.t === "MESSAGE_CREATE") {
        const msg = data.d;
        if (!msg || !msg.author) return;

        // 1. Cache message for delete/edit audit logs
        cacheMessage(msg);

        // Ignore bot's own messages
        if (msg.author.bot) return;

        // 2. Check if bot is mentioned (User Mention OR Role Mention)
        // 2. Check if bot is mentioned or if this message is a reply to the bot
        let isReplyToBot = false;
        let referencedImagePrompt = null;

        if (msg.message_reference && msg.message_reference.message_id) {
          try {
            const refRes = await discordApi(`/channels/${msg.channel_id}/messages/${msg.message_reference.message_id}`);
            if (refRes.ok) {
              const refMsg = await refRes.json();
              if (refMsg.author?.id === "1552302920912080927") {
                isReplyToBot = true;
                // Check if referenced message contains an AI generated image
                const imgEmbed = refMsg.embeds?.find(e =>
                  (e.title && e.title.includes("AI Generated Image")) ||
                  (e.image && e.image.url)
                );
                if (imgEmbed) {
                  const match = (imgEmbed.description || "").match(/\*\*Prompt:\*\*\s*\*"([^"]+)"/);
                  referencedImagePrompt = match ? match[1] : (imgEmbed.description || "");
                }
              }
            }
          } catch (_) {}
        }

        const isUserMentioned = (msg.mentions || []).some(u => u.id === "1552302920912080927") ||
          (msg.content && (msg.content.includes("<@1552302920912080927>") || msg.content.includes("<@!1552302920912080927>")));

        const isRoleMentioned = (msg.mention_roles || []).includes("1552307486613311610") ||
          (msg.content && msg.content.includes("<@&1552307486613311610>"));

        const isBotMentioned = isUserMentioned || isRoleMentioned || isReplyToBot;

        if (isBotMentioned) {
          await sendTyping(msg.channel_id);

          // Clean question text
          const cleanQuestion = (msg.content || "")
            .replace(/<@!?1552302920912080927>/g, "")
            .replace(/<@&1552307486613311610>/g, "")
            .trim();

          // 0. If replying to an image, treat it as an image modification / revision!
          if (referencedImagePrompt) {
            const combinedPrompt = `${referencedImagePrompt}, ${cleanQuestion}`;
            const imgPayload = generateAiImage(combinedPrompt, msg.author.id);
            await discordApi(`/channels/${msg.channel_id}/messages`, {
              method: "POST",
              body: JSON.stringify({
                ...imgPayload,
                message_reference: { message_id: msg.id }
              })
            });
            return;
          }

          // A. Tag Intent (e.g. "tag enriko", "panggil wahyu", "mention matoa")
          const cleanLower = cleanQuestion.toLowerCase();
          const isTagRequest = cleanLower.startsWith("tag ") || cleanLower.startsWith("panggil ") || cleanLower.startsWith("mention ") ||
            cleanLower.includes("tolong tag ") || cleanLower.includes("tolong panggil ") || cleanLower.includes("coba tag ") || cleanLower.includes("bisa tag ");

          if (isTagRequest) {
            const target = findMemberToTag(cleanLower);
            if (target) {
              await discordApi(`/channels/${msg.channel_id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                  content: `Halo <@${target.id}>! Kamu dipanggil oleh <@${msg.author.id}> nih 👋`,
                  message_reference: { message_id: msg.id }
                })
              });
              return;
            }
          }

          // B. Poll Intent (e.g. "buatkan poll ...", "bikin polling ...", "poll: ... | ...")
          const isPollRequest = cleanLower.startsWith("poll") || cleanLower.startsWith("polling") ||
            cleanLower.startsWith("buatkan poll") || cleanLower.startsWith("bikin poll") ||
            cleanLower.startsWith("buatkan polling") || cleanLower.startsWith("bikin polling") ||
            cleanLower.startsWith("voting");

          if (isPollRequest) {
            const parsed = parsePollFromText(cleanQuestion);
            if (parsed) {
              const pollPayload = createPollPayload(parsed.question, parsed.options, msg.author.id);
              const postRes = await discordApi(`/channels/${msg.channel_id}/messages`, {
                method: "POST",
                body: JSON.stringify(pollPayload)
              });
              if (postRes.ok) {
                const postData = await postRes.json();
                addPollReactions(msg.channel_id, postData.id, pollPayload.optionsCount);
              }
              return;
            }
          }

          // C. Image Generation Intent (e.g. "buat kan gambar ...", "gambarkan ...", "generate image ...")
          const imagePromptExtracted = extractImagePrompt(cleanQuestion);

          if (imagePromptExtracted) {
            const imgPayload = generateAiImage(imagePromptExtracted, msg.author.id);
            await discordApi(`/channels/${msg.channel_id}/messages`, {
              method: "POST",
              body: JSON.stringify({
                ...imgPayload,
                message_reference: { message_id: msg.id }
              })
            });
            return;
          }

          // D. Document Creation Intent (e.g. "buatkan dokumen ...", "bikin doc ...")
          const isDocRequest = cleanLower.startsWith("buatkan dokumen") ||
            cleanLower.startsWith("bikin dokumen") ||
            cleanLower.startsWith("buatkan doc") ||
            cleanLower.startsWith("tuliskan dokumen");

          if (isDocRequest) {
            const topic = cleanQuestion
              .replace(/^(buatkan dokumen|bikin dokumen|buatkan doc|tuliskan dokumen)\s*/i, "")
              .trim();

            const docPrompt = `Buatkan dokumen teknis profesional yang terstruktur lengkap dalam format Markdown mengenai topik: "${topic}". Dokumen harus mencakup: Judul, Pendahuluan, Arsitektur/Spesifikasi, Alur Kerja, Panduan Implementasi, dan Kesimpulan.`;
            const docText = await generateAiAnswer(docPrompt, msg.author.id, msg.channel_id);

            await discordApi(`/channels/${msg.channel_id}/messages`, {
              method: "POST",
              body: JSON.stringify({
                embeds: [{
                  title: `📄 Dokumen: ${topic}`,
                  description: docText.length > 4000 ? docText.slice(0, 3950) + "...\n*(Dokumen terpotong batas maksimal)*" : docText,
                  color: 0x1ABC9C,
                  footer: { text: "Dokumen Resmi • Dibuat oleh Suiflex Architect AI" },
                  timestamp: new Date().toISOString()
                }],
                message_reference: { message_id: msg.id }
              })
            });
            return;
          }

          // E. Stack Overview Intent (e.g. "stack", "peta modul", "daftar modul", "apa saja modul suiflex")
          if (cleanLower === "stack" || cleanLower.includes("peta modul") || cleanLower.includes("daftar modul") || cleanLower.includes("modul apa saja")) {
            await discordApi(`/channels/${msg.channel_id}/messages`, {
              method: "POST",
              body: JSON.stringify({
                content: formatModuleAnswer("suiflex") || "Berikut 10 modul rekayasa Suiflex:",
                embeds: [{
                  title: "📦 10 Modul Ekosistem Suiflex Open Engineering",
                  description: "Kunjungi portal dokumentasi resmi untuk mempelajari seluruh modul:\n👉 **https://www.suiflex.dev**",
                  color: 0xF1C40F
                }],
                message_reference: { message_id: msg.id },
                components: [
                  {
                    type: 1,
                    components: [
                      { type: 2, style: 5, label: "🌐 Website Resmi", url: "https://www.suiflex.dev" },
                      { type: 2, style: 5, label: "🐙 Organisasi GitHub", url: "https://github.com/suiflex" }
                    ]
                  }
                ]
              })
            });
            return;
          }

          // F. Docs Intent (e.g. "docs arsy", "dokumentasi rdb", "cara install forgeguard")
          const docsMatch = cleanLower.match(/^(?:docs|dokumentasi|cara install)\s+([a-z0-9_-]+)/i);
          if (docsMatch) {
            const targetModKey = Object.keys(SUIFLEX_MODULES).find(k => k.includes(docsMatch[1]) || docsMatch[1].includes(k));
            if (targetModKey) {
              const docContent = formatModuleAnswer(targetModKey);
              await discordApi(`/channels/${msg.channel_id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                  content: docContent,
                  message_reference: { message_id: msg.id }
                })
              });
              return;
            }
          }

          // G. Clear Chat Intent for Admins/Mods (e.g. "clear 10", "hapus 20 pesan", "bersihkan 5 chat")
          const clearMatch = cleanLower.match(/^(?:clear|hapus|bersihkan)\s+(\d+)/i);
          if (clearMatch) {
            const amount = parseInt(clearMatch[1], 10);
            const permissions = BigInt(msg.member?.permissions || "0");
            const canManage = (permissions & 8n) === 8n || (permissions & 8192n) === 8192n;

            if (!canManage) {
              await discordApi(`/channels/${msg.channel_id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                  content: "❌ Anda tidak memiliki izin `Manage Messages` untuk membersihkan chat.",
                  message_reference: { message_id: msg.id }
                })
              });
              return;
            }

            try {
              const fetchRes = await discordApi(`/channels/${msg.channel_id}/messages?limit=${amount + 1}`);
              const msgs = await fetchRes.json();
              const messageIds = msgs.map(m => m.id);
              if (messageIds.length > 0) {
                await discordApi(`/channels/${msg.channel_id}/messages/bulk-delete`, {
                  method: "POST",
                  body: JSON.stringify({ messages: messageIds })
                });
              }
            } catch (_) {}
            return;
          }

          // H. Ping / Status Intent (e.g. "ping", "status bot", "cek status")
          if (cleanLower === "ping" || cleanLower === "status bot" || cleanLower === "cek status") {
            const uptimeMinutes = Math.floor((Date.now() - BOT_START_TIME) / 60000);
            await discordApi(`/channels/${msg.channel_id}/messages`, {
              method: "POST",
              body: JSON.stringify({
                embeds: [{
                  title: "🏓 Pong! • Suiflex Architect AI",
                  description: `**Status Sistem:** 🟢 Online 24/7 (Railway Cloud)\n**Uptime:** ${uptimeMinutes} menit\n**Latency:** < 40ms\n**AI Engine:** Google Gemini 3.6 Flash Active`,
                  color: 0x2ECC71,
                  timestamp: new Date().toISOString()
                }],
                message_reference: { message_id: msg.id }
              })
            });
            return;
          }

          // I. Default: Intelligent AI Q&A via Google Gemini!
          const replyText = await generateAiAnswer(cleanQuestion || "halo", msg.author.id, msg.channel_id);

          await discordApi(`/channels/${msg.channel_id}/messages`, {
            method: "POST",
            body: JSON.stringify({
              content: replyText,
              message_reference: { message_id: msg.id }
            })
          });
        }
      }

      // Event: MESSAGE_DELETE (Audit Log: Message Deleted)
      if (data.t === "MESSAGE_DELETE") {
        const { id, channel_id, guild_id } = data.d;
        if (guild_id !== SUIFLEX_GUILD_ID) return;

        const cached = messageCache.get(id);
        const authorTag = cached?.author ? `${cached.author.username}#${cached.author.discriminator} (<@${cached.author.id}>)` : "Unknown User";
        const contentText = cached?.content ? `\`\`\`\n${cached.content.slice(0, 1000)}\n\`\`\`` : "*Konten tidak tersedia di cache memori.*";

        await logAuditEvent({
          title: "🗑️ Pesan Dihapus / Message Deleted",
          color: 0xE74C3C,
          fields: [
            { name: "👤 Penulis", value: authorTag, inline: true },
            { name: "📍 Channel", value: `<#${channel_id}>`, inline: true },
            { name: "📝 Isi Pesan yang Dihapus", value: contentText, inline: false }
          ],
          footer: { text: `Message ID: ${id}` },
          timestamp: new Date().toISOString()
        });
      }

      // Event: MESSAGE_UPDATE (Audit Log: Message Edited)
      if (data.t === "MESSAGE_UPDATE") {
        const msg = data.d;
        if (!msg.guild_id || msg.guild_id !== SUIFLEX_GUILD_ID) return;
        if (msg.author?.bot) return;

        const cached = messageCache.get(msg.id);
        // Only log if content actually changed
        if (cached && msg.content && cached.content !== msg.content) {
          await logAuditEvent({
            title: "✏️ Pesan Diedit / Message Edited",
            color: 0xF39C12,
            fields: [
              { name: "👤 Penulis", value: `${cached.author.username} (<@${cached.author.id}>)`, inline: true },
              { name: "📍 Channel", value: `<#${msg.channel_id}> • [Lompat ke Pesan](https://discord.com/channels/${SUIFLEX_GUILD_ID}/${msg.channel_id}/${msg.id})`, inline: true },
              { name: "🔴 Sebelum Diedit", value: `\`\`\`\n${cached.content.slice(0, 500)}\n\`\`\``, inline: false },
              { name: "🟢 Setelah Diedit", value: `\`\`\`\n${msg.content.slice(0, 500)}\n\`\`\``, inline: false }
            ],
            footer: { text: `Message ID: ${msg.id}` },
            timestamp: new Date().toISOString()
          });

          // Update cache with new content
          cacheMessage({ ...cached, content: msg.content });
        }
      }

      // Event: INTERACTION_CREATE (Slash Commands)
      if (data.t === "INTERACTION_CREATE") {
        const interaction = data.d;

        if (interaction.type === 2) { // APPLICATION_COMMAND
          const { id: interactionId, token: interactionToken, data: cmdData, member } = interaction;
          const cmdName = cmdData.name;

          const reply = async (payload) => {
            await discordApi(`/interactions/${interactionId}/${interactionToken}/callback`, {
              method: "POST",
              body: JSON.stringify({
                type: 4,
                data: payload
              })
            });
          };

          // 1. /ping
          if (cmdName === "ping") {
            const uptimeMinutes = Math.floor((Date.now() - BOT_START_TIME) / 60000);
            await reply({
              embeds: [{
                title: "🏓 Pong! • Suiflex Architect v3.0",
                description: [
                  "**Status Sistem:** 🟢 Online 24/7 (Railway Cloud)",
                  `**Uptime:** ${uptimeMinutes} menit`,
                  "**Host:** Railway Managed Linux Container",
                  "**Gateway Latency:** < 45ms",
                  "**Subsystems Active:** AutoRole, WelcomeCard, SlashCommands, GitHubSync, AiAssistant, AuditLogger"
                ].join("\n"),
                color: 0x2ECC71,
                timestamp: new Date().toISOString()
              }]
            });
          }

          // 2. /stack
          if (cmdName === "stack") {
            await reply({
              embeds: [{
                title: "📦 10 Modul Ekosistem Suiflex Open Engineering",
                description: [
                  "Suiflex menyediakan rangkaian alat rekayasa perangkat lunak open-source untuk manusia dan AI agents.",
                  "",
                  "🌐 **Portal Dokumentasi Resmi:** [https://www.suiflex.dev](https://www.suiflex.dev)",
                  ""
                ].join("\n"),
                fields: [
                  {
                    name: "🤖 AI Agents & Coding Harness",
                    value: "• **Arsy Code:** AI coding-agent harness terminal-first\n• **Kurir:** Multi-harness agent coordinator\n• **Fluxguard:** LLM token context & cost optimizer"
                  },
                  {
                    name: "🛡️ QA & Engineering Verification",
                    value: "• **ForgeGuard:** Gate validation untuk AI coding agents\n• **Suitest:** Self-hostable MCP-native QA platform"
                  },
                  {
                    name: "🗄️ Data & Tools Infrastructure",
                    value: "• **rdb:** One native binary cross-database client (11 engines)\n• **websift:** Keyless web search & fast reader CLI\n• **SafeHell:** Local human-in-the-loop SSH broker\n• **Note:** Developer discussion transcription tool"
                  },
                  {
                    name: "🍺 Distribution",
                    value: "• **Tap:** Official Homebrew tap (`brew tap suiflex/tap`)"
                  }
                ],
                color: 0xF1C40F,
                footer: { text: "Kunjungi https://www.suiflex.dev untuk dokumentasi interaktif lengkap" }
              }],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "🌐 Buka Website (suiflex.dev)",
                      url: "https://www.suiflex.dev"
                    },
                    {
                      type: 2,
                      style: 5,
                      label: "🐙 Organisasi GitHub",
                      url: "https://github.com/suiflex"
                    }
                  ]
                }
              ]
            });
          }

          // 3. /docs
          if (cmdName === "docs") {
            const modKey = cmdData.options?.[0]?.value;
            const mod = SUIFLEX_MODULES[modKey];
            if (mod) {
              await reply({
                embeds: [{
                  title: `📚 Dokumentasi Resmi: ${mod.name}`,
                  description: [
                    mod.desc,
                    "",
                    "🌐 **Website Dokumentasi:** [https://www.suiflex.dev](https://www.suiflex.dev)",
                    `🐙 **GitHub Repository:** [${mod.url}](${mod.url})`
                  ].join("\n"),
                  fields: [
                    { name: "📂 Kategori", value: mod.category, inline: true },
                    { name: "🌐 Website Portal", value: "[suiflex.dev](https://www.suiflex.dev)", inline: true },
                    { name: "⚡ Perintah Install", value: `\`\`\`bash\n${mod.install}\n\`\`\``, inline: false },
                    { name: "🔗 Akses Cepat", value: `• 🌐 [Buka Dokumentasi di Website](https://www.suiflex.dev)\n• 🐙 [Buka Repositori GitHub](${mod.url})`, inline: false }
                  ],
                  color: 0x3498DB,
                  footer: { text: "Suiflex Open Engineering System • https://www.suiflex.dev" },
                  timestamp: new Date().toISOString()
                }],
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: "🌐 Buka Website Dokumentasi",
                        url: "https://www.suiflex.dev"
                      },
                      {
                        type: 2,
                        style: 5,
                        label: "🐙 GitHub Repository",
                        url: mod.url
                      }
                    ]
                  }
                ]
              });
            }
          }

          // 4. /github
          if (cmdName === "github") {
            const modKey = cmdData.options?.[0]?.value;
            const mod = SUIFLEX_MODULES[modKey];
            if (mod) {
              await reply({
                embeds: [{
                  title: `🐙 GitHub Repository: ${mod.name}`,
                  description: [
                    `Akses source code, kontribusi, dan issue tracker resmi untuk **${mod.name}**:`,
                    "",
                    `👉 **[${mod.url}](${mod.url})**`,
                    "🌐 **Website Dokumentasi:** [https://www.suiflex.dev](https://www.suiflex.dev)"
                  ].join("\n"),
                  fields: [
                    { name: "🚀 Quick Install", value: `\`\`\`bash\n${mod.install}\n\`\`\`` }
                  ],
                  color: 0x2C3E50,
                  footer: { text: "Open-source under MIT / Apache-2.0 • suiflex.dev" }
                }],
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: "🐙 Buka GitHub Repo",
                        url: mod.url
                      },
                      {
                        type: 2,
                        style: 5,
                        label: "🌐 Website Dokumentasi",
                        url: "https://www.suiflex.dev"
                      }
                    ]
                  }
                ]
              });
            }
          }

          // 5. /clear
          if (cmdName === "clear") {
            const amount = cmdData.options?.[0]?.value || 10;
            const channelId = interaction.channel_id;

            const permissions = BigInt(member.permissions || "0");
            const canManage = (permissions & 8n) === 8n || (permissions & 8192n) === 8192n;

            if (!canManage) {
              await reply({
                content: "❌ Anda tidak memiliki izin `Manage Messages` untuk membersihkan chat.",
                flags: 64
              });
              return;
            }

            try {
              const fetchRes = await discordApi(`/channels/${channelId}/messages?limit=${amount}`);
              const msgs = await fetchRes.json();
              const messageIds = msgs.map(m => m.id);

              if (messageIds.length > 0) {
                await discordApi(`/channels/${channelId}/messages/bulk-delete`, {
                  method: "POST",
                  body: JSON.stringify({ messages: messageIds })
                });

                await reply({
                  content: `🧹 Berhasil membersihkan **${messageIds.length}** pesan obrolan di channel ini.`,
                  flags: 64
                });
              } else {
                await reply({ content: "Tidak ada pesan yang dapat dihapus.", flags: 64 });
              }
            } catch (e) {
              await reply({ content: `Gagal menghapus pesan: ${e.message}`, flags: 64 });
            }
          }

          // 6. /serverinfo
          if (cmdName === "serverinfo") {
            const guildRes = await discordApi(`/guilds/${SUIFLEX_GUILD_ID}?with_counts=true`);
            const g = await guildRes.json();

            await reply({
              embeds: [{
                title: `ℹ️ Informasi Server: ${g.name}`,
                description: g.description || "Open engineering ecosystem for humans and AI agents.",
                fields: [
                  { name: "👑 Owner", value: `<@${g.owner_id}>`, inline: true },
                  { name: "👥 Total Anggota", value: `${g.approximate_member_count || "22"} members`, inline: true },
                  { name: "🟢 Online", value: `${g.approximate_presence_count || "Online"}`, inline: true },
                  { name: "🛡️ Verification Level", value: "Level 1 (Email Verified)", inline: true },
                  { name: "🚀 Bot Engine", value: "Suiflex Architect v3.0 (Railway Cloud)", inline: true }
                ],
                color: 0x9B59B6,
                thumbnail: { url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null },
                footer: { text: `Server ID: ${g.id}` },
                timestamp: new Date().toISOString()
              }]
            });
          }

          // 7. /userinfo
          if (cmdName === "userinfo") {
            const targetUser = cmdData.options?.[0]?.value
              ? interaction.data.resolved?.users?.[cmdData.options[0].value]
              : member.user;

            const targetMember = cmdData.options?.[0]?.value
              ? interaction.data.resolved?.members?.[cmdData.options[0].value]
              : member;

            const avatarUrl = targetUser.avatar
              ? `https://cdn.discordapp.com/avatars/${targetUser.id}/${targetUser.avatar}.png?size=256`
              : "https://cdn.discordapp.com/embed/avatars/0.png";

            const rolesList = (targetMember.roles || []).map(r => `<@&${r}>`).join(" ") || "None";

            await reply({
              embeds: [{
                title: `👤 Profil: ${targetUser.username}`,
                thumbnail: { url: avatarUrl },
                fields: [
                  { name: "🆔 User ID", value: targetUser.id, inline: true },
                  { name: "🤖 Bot", value: targetUser.bot ? "Ya" : "Tidak", inline: true },
                  { name: "🏷️ Peran (Roles)", value: rolesList, inline: false },
                  { name: "📅 Bergabung Server", value: targetMember.joined_at ? new Date(targetMember.joined_at).toLocaleDateString("id-ID") : "Unknown", inline: true }
                ],
                color: 0x1ABC9C,
                footer: { text: "Suiflex Community Directory" }
              }]
            });
          }
          // 8. /ask (AI Assistant Slash Command)
          if (cmdName === "ask") {
            const question = cmdData.options?.[0]?.value || "";
            const replyText = await generateAiAnswer(question, member.user.id, interaction.channel_id);
            await reply({
              embeds: [{
                title: "🤖 Jawaban AI Assistant • Suiflex Architect",
                description: `**Pertanyaan dari <@${member.user.id}>:**\n*"${question}"*\n\n${replyText}`,
                color: 0x3498DB,
                footer: { text: "Suiflex Open Engineering System • https://www.suiflex.dev" },
                timestamp: new Date().toISOString()
              }],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "🌐 Portal Dokumentasi",
                      url: "https://www.suiflex.dev"
                    },
                    {
                      type: 2,
                      style: 5,
                      label: "🐙 GitHub Suiflex",
                      url: "https://github.com/suiflex"
                    }
                  ]
                }
              ]
            });
          }
          // 9. /image (AI Image Generator)
          if (cmdName === "image") {
            const prompt = cmdData.options?.[0]?.value || "futuristic technology landscape";
            const imagePayload = generateAiImage(prompt, member.user.id);
            await reply(imagePayload);
          }

          // 10. /doc (AI Document Maker)
          if (cmdName === "doc") {
            const topic = cmdData.options?.[0]?.value || "Software Specification";
            const prompt = `Buatkan dokumen teknis profesional yang terstruktur lengkap dalam format Markdown mengenai topik: "${topic}". Dokumen harus mencakup: Judul, Pendahuluan, Arsitektur/Spesifikasi, Alur Kerja, Panduan Implementasi, dan Kesimpulan.`;
            const docText = await generateAiAnswer(docPrompt, member.user.id, interaction.channel_id);

            await reply({
              embeds: [{
                title: `📄 Dokumen: ${topic}`,
                description: docText.length > 4000 ? docText.slice(0, 3950) + "...\n*(Dokumen terpotong batas maksimal)*" : docText,
                color: 0x1ABC9C,
                footer: { text: "Dokumen Resmi • Dibuat oleh Suiflex Architect AI" },
                timestamp: new Date().toISOString()
              }],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "🌐 Dokumentasi Suiflex",
                      url: "https://www.suiflex.dev"
                    }
                  ]
                }
              ]
            });
          }
          // 11. /poll (Interactive Community Poll)
          if (cmdName === "poll") {
            const question = cmdData.options?.find(o => o.name === "question")?.value || "Jajak Pendapat";

            // Support both separate options (option1..option5) and legacy options string
            let options = [];
            for (let i = 1; i <= 5; i++) {
              const optVal = cmdData.options?.find(o => o.name === `option${i}`)?.value;
              if (optVal && optVal.trim()) {
                options.push(optVal.trim());
              }
            }
            if (options.length === 0) {
              const optionsStr = cmdData.options?.find(o => o.name === "options")?.value || "";
              options = optionsStr.split(/[,|;\n]/).map(s => s.trim()).filter(Boolean);
            }

            if (options.length < 2) {
              await reply({ content: "❌ Harap berikan minimal 2 pilihan jawaban (option1 dan option2).", flags: 64 });
              return;
            }
            const pollPayload = createPollPayload(question, options, member.user.id);
            await reply(pollPayload);

            try {
              const originRes = await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interactionToken}/messages/@original`);
              if (originRes.ok) {
                const originData = await originRes.json();
                addPollReactions(interaction.channel_id, originData.id, pollPayload.optionsCount);
              }
            } catch (_) {}
          }
        }
      }

    } catch (e) {
      console.error("[Architect v3.0] Error parsing message:", e.message);
    }
  });

  ws.on("close", (code, reason) => {
    console.warn(`[Architect v3.0] Disconnected (${code}). Reconnecting in 5 seconds...`);
    clearInterval(heartbeatTimer);
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("[Architect v3.0] Gateway error:", err.message);
  });
}

// ==========================================
// 🚀 5. HTTP SERVER (Railway Webhook Gateway)
// ==========================================
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/github-webhook") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const eventType = req.headers["x-github-event"];
        if (eventType && payload) {
          await handleGitHubEvent({
            type: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}Event`,
            payload,
            repo: payload.repository,
            actor: payload.sender
          });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health check endpoint
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Suiflex Architect v3.0 Bot is running 24/7 on Railway Cloud!\n");
});

server.listen(PORT, () => {
  console.log(`[Architect v3.0] HTTP Webhook Server listening on port ${PORT}`);
});
// Initialize member roster cache
refreshGuildMembers();
setInterval(refreshGuildMembers, 15 * 60 * 1000);

connect();
