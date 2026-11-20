// Stop hook: runs npm run check:quick when Claude Code finishes a turn and
// sends any failure back to Claude. stop_hook_active is true when Claude is
// already continuing because of this hook, so it blocks once and then lets Claude stop.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { stop_hook_active } = JSON.parse(readFileSync(0, "utf8"));
if (stop_hook_active) process.exit(0);

const result = spawnSync("npm run check:quick 2>&1", {
  cwd: fileURLToPath(new URL("../../", import.meta.url)),
  shell: true,
  encoding: "utf8",
  timeout: 170_000,
  killSignal: "SIGKILL",
});
if (result.status === 0) process.exit(0);

const output = [result.error?.message, result.stdout]
  .filter(Boolean)
  .join("\n")
  .trim();
// Keep the start and the end, where the task runner names the failed scripts.
const excerpt =
  output.length <= 16_000
    ? output
    : `${output.slice(0, 8_000)}\n… output shortened …\n${output.slice(-8_000)}`;
const outcome = result.signal ? `was stopped (${result.signal})` : "failed";
console.log(
  JSON.stringify({
    decision: "block",
    reason: `npm run check:quick ${outcome}. Fix the reported issues and rerun it before finishing.\n\n${excerpt}`,
  }),
);
