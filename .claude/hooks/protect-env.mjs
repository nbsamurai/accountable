// PreToolUse hook: stops Claude Code from editing .env.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const { tool_name, tool_input = {} } = JSON.parse(readFileSync(0, "utf8"));

// A shell command can write a file in too many ways to parse, so any command
// that names .env is denied, as in the Codex hook. .env.example stays allowed.
const namesEnv = /(^|[^\w.-])\.env(?=$|[^\w.-])/im;

const touchesEnv =
  tool_name === "Bash"
    ? namesEnv.test(tool_input.command ?? "")
    : basename(
        tool_input.file_path ?? tool_input.notebook_path ?? "",
      ).toLowerCase() === ".env";

if (touchesEnv) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "This project protects .env. Leave it for the user to manage.",
      },
    }),
  );
}
