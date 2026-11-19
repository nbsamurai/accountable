// The one command: `npm run dev`. Installs what's missing, starts the backend and the
// frontend, waits until they answer, opens the browser, and stops both on Ctrl+C.
// It uses only Node's own modules, so it runs before anything is installed.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const HOST = "127.0.0.1";
const API_PORT = 8000;
const WEB_PORT = 5173;
const APP_URL = `http://${HOST}:${WEB_PORT}/`;

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function say(message) {
  console.log(`[accountable] ${message}`);
}

// 1. Node.js 24 or later, and uv.
function checkTools() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 24) {
    fail(
      `Accountable needs Node.js 24 or later, and this is Node.js ${process.versions.node}.\n` +
        "Install the current LTS from https://nodejs.org, then run npm run dev again.",
    );
  }
  const uv = spawnSync("uv", ["--version"], { stdio: "ignore" });
  if (uv.error || uv.status !== 0) {
    fail(
      "Accountable needs uv, which runs its Python backend.\n" +
        "Install it from https://docs.astral.sh/uv/getting-started/installation/, then run npm run dev again.",
    );
  }
}

// 2. npm install when node_modules is missing or older than package-lock.json, then uv sync.
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: isWindows });
  if (result.error || result.status !== 0) {
    fail(`"${command} ${args.join(" ")}" failed. Check the messages above, then run npm run dev again.`);
  }
}

function installPackages() {
  const modules = join(root, "node_modules");
  const lock = join(root, "package-lock.json");
  const stale =
    !existsSync(modules) || (existsSync(lock) && statSync(modules).mtimeMs < statSync(lock).mtimeMs);
  if (stale) {
    say("Installing the frontend's packages. The first time takes a minute or two.");
    run("npm", ["install"]);
  }
  say("Checking the backend's packages.");
  run("uv", ["sync", "--quiet"]);
}

// 3. Both ports must be free before anything starts.
function portIsFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, HOST);
  });
}

async function checkPorts() {
  for (const port of [WEB_PORT, API_PORT]) {
    if (!(await portIsFree(port))) {
      fail(`Port ${port} is in use. Is Accountable already running?`);
    }
  }
}

const children = [];

function start(name, command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit", ...options });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      say(`The ${name} stopped (${signal ?? `exit code ${code}`}). Stopping Accountable.`);
      stop(1);
    }
  });
  children.push(child);
  return child;
}

function startServers() {
  start("backend", "uv", [
    "run",
    "--quiet",
    "uvicorn",
    "--factory",
    "backend.app.main:create_app",
    "--host",
    HOST,
    "--port",
    String(API_PORT),
  ]);
  const vite = join(root, "node_modules", "vite", "bin", "vite.js");
  start("frontend", process.execPath, [vite, "--host", HOST, "--port", String(WEB_PORT), "--strictPort"], {
    cwd: join(root, "frontend"),
  });
}

// 4. Wait for the backend's /api/health, then for the same address through the frontend,
//    so both servers are known to answer.
async function waitFor(url, deadline) {
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function waitForHealth() {
  const deadline = Date.now() + 60_000;
  const up =
    (await waitFor(`http://${HOST}:${API_PORT}/api/health`, deadline)) &&
    (await waitFor(`${APP_URL}api/health`, deadline));
  if (!up && !stopping) {
    say("Accountable didn't start within a minute. Check the messages above.");
    stop(1);
  }
}

function openBrowser() {
  if (process.env.ACCOUNTABLE_NO_OPEN) return;
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [APP_URL]]
      : isWindows
        ? ["cmd", ["/c", "start", "", APP_URL]]
        : ["xdg-open", [APP_URL]];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => say(`Open ${APP_URL} in your browser.`));
  child.unref();
}

// 5. Ctrl+C stops both servers, and their own child processes.
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    if (isWindows) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 500).unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

checkTools();
installPackages();
await checkPorts();
startServers();
await waitForHealth();
if (!stopping) {
  say(`Accountable is running at ${APP_URL}. Press Ctrl+C to stop it.`);
  openBrowser();
}
