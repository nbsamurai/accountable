import { spawnSync } from "node:child_process";

const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this script through npm.");

const failed = [];
for (const task of process.argv.slice(2)) {
  const result = spawnSync(process.execPath, [npm, "run", task], { stdio: "inherit" });
  if (result.status !== 0) {
    failed.push(task);
    if (result.error) console.error(result.error.message);
    if (result.signal) console.error(`${task} ended with ${result.signal}`);
  }
}

if (failed.length > 0) {
  console.error(`\nFailed npm scripts: ${failed.join(", ")}`);
  process.exitCode = 1;
}
