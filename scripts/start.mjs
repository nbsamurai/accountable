// `npm start`: runs Accountable the way Render does (spec 9.6). It needs all three Supabase
// settings in .env. It builds the frontend, then runs one server on 127.0.0.1:8000, which
// runs the migrations and serves the built frontend and the API. Ctrl+C stops it.

import { spawn, spawnSync } from "node:child_process";
import { missingSettings, root, withEnvFile } from "./env.mjs";

const HOST = "127.0.0.1";
const PORT = 8000;
const isWindows = process.platform === "win32";
const env = withEnvFile();

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const missing = missingSettings(env);
if (missing.length > 0) {
  fail(
    "npm start runs Accountable on Supabase, as Render does, so it needs all three Supabase " +
      `settings in .env. Missing: ${missing.join(", ")}.`,
  );
}

console.log("[accountable] Building the frontend.");
const build = spawnSync("npm", ["run", "build", "--workspace", "frontend"], {
  cwd: root,
  stdio: "inherit",
  shell: isWindows,
});
if (build.error || build.status !== 0) fail("The frontend didn't build. Check the messages above.");

console.log(`[accountable] Starting at http://${HOST}:${PORT}/. Press Ctrl+C to stop it.`);
const server = spawn(
  "uv",
  ["run", "--quiet", "uvicorn", "--factory", "backend.app.main:create_app", "--host", HOST, "--port", String(PORT)],
  { cwd: root, stdio: "inherit", env, shell: isWindows },
);
server.on("exit", (code, signal) => process.exit(signal ? 0 : (code ?? 1)));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill("SIGTERM"));
