/**
 * Suiflex Architect - Automated Failover Watchdog
 * Monitors Railway Cloud status 24/7.
 * When Railway goes down, immediately activates the backup bot.
 */

const { spawn, execSync } = require("child_process");

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const BOT_DIR = __dirname;
let isRailwayDown = false;
let backupProcess = null;

async function checkRailwayStatus() {
  try {
    const railwayBin = path.join(BOT_DIR, "node_modules", ".bin", "railway.cmd");
    const statusOut = execSync(`"${railwayBin}" status`, {
      cwd: BOT_DIR,
      env: { ...process.env, RAILWAY_TOKEN },
      encoding: "utf-8",
      timeout: 10000
    });

    const isOnline = statusOut.includes("● Online") || statusOut.includes("Active");
    return isOnline;
  } catch (e) {
    return false;
  }
}

function startBackupBot() {
  if (backupProcess) return;
  console.warn("[FAILOVER] ⚠️ Railway Cloud is DOWN! Activating Backup Bot...");

  backupProcess = spawn("node", ["index.js"], {
    cwd: BOT_DIR,
    env: {
      ...process.env,
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    },
    stdio: "inherit"
  });

  backupProcess.on("exit", (code) => {
    console.log(`[FAILOVER] Backup bot exited with code ${code}`);
    backupProcess = null;
  });
}

function stopBackupBot() {
  if (backupProcess) {
    console.log("[FAILOVER] 🟢 Railway Cloud is back ONLINE. Stopping backup bot to avoid duplicate instances...");
    backupProcess.kill();
    backupProcess = null;
  }
}

async function loop() {
  const online = await checkRailwayStatus();
  if (online) {
    if (isRailwayDown) {
      isRailwayDown = false;
      stopBackupBot();
    }
  } else {
    if (!isRailwayDown) {
      isRailwayDown = true;
      startBackupBot();
    }
  }
}

console.log("[FAILOVER WATCHDOG] Active and monitoring Railway Cloud status...");
setInterval(loop, 60000);
loop();