import { readFileSync } from "node:fs";

const { tool_name, tool_input } = JSON.parse(readFileSync(0, "utf8"));
const command = tool_input?.command ?? "";
const patchPath = /^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.*)$/gm;
const envReference = /(^|[^\w.-])\.env(?=$|[^\w.-])/im;

const touchesEnv =
  tool_name === "apply_patch"
    ? Array.from(command.matchAll(patchPath), (match) => match[1].trim()).some(
        (path) => /(^|[/\\])\.env$/i.test(path),
      )
    : envReference.test(
        tool_name === "Bash" ? command : JSON.stringify(tool_input ?? {}),
      );

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
