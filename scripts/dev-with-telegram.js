/**
 * Next.js dev + Telegram collector 동시 실행 (실시간 속보)
 * Usage: npm run dev:live
 */
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`[${label}] exited ${code}`);
  });
  return child;
}

const next = run(isWin ? "npm.cmd" : "npm", ["run", "dev", "--", "-p", "3000"], "next");
setTimeout(() => {
  run("python", ["scripts/telegram-osint/collector.py"], "telegram");
}, 4000);

function shutdown() {
  next.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
