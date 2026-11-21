// PreToolUse hook for the reviewer subagent: lets its Bash calls only read.
// Claude Code can't limit a subagent's Bash to some commands through its tool
// list, so this hook denies any command that isn't on the lists below. It
// never approves a command: an allowed one goes through the normal
// permission flow.
import { readFileSync } from "node:fs";

const READ_COMMANDS = new Set([
  "cat",
  "cd",
  "diff",
  "echo",
  "find",
  "grep",
  "head",
  "ls",
  "pwd",
  "rg",
  "tail",
  "wc",
]);

const GIT_READ_COMMANDS = new Set([
  "blame",
  "branch",
  "cat-file",
  "describe",
  "diff",
  "grep",
  "log",
  "ls-files",
  "ls-tree",
  "merge-base",
  "rev-list",
  "rev-parse",
  "shortlog",
  "show",
  "status",
]);

// Options that make a read command write a file or run another program.
const BLOCKED_OPTIONS = {
  find: [
    "-delete",
    "-exec",
    "-execdir",
    "-ok",
    "-okdir",
    "-fls",
    "-fprint",
    "-fprint0",
    "-fprintf",
  ],
  rg: ["--pre"],
};

// Git accepts any unambiguous start of a long option, such as --out.
const GIT_WRITE_OPTIONS = ["--output", "--open-files-in-pager"];

// `git branch` with anything else can create, rename or delete a branch.
const BRANCH_LIST_OPTIONS = new Set([
  "-a",
  "-r",
  "-v",
  "-vv",
  "--all",
  "--list",
  "--remotes",
  "--show-current",
]);

// Redirects that only throw output away.
const DISCARD_REDIRECT = /^\d?>(\s*\/dev\/null|&[12])(?=\s|$|[|;&])/;

class Denied extends Error {}

// Splits a command into segments of words, the way a shell would, and
// denies the shell syntax that could write a file or run a hidden command.
function parse(command) {
  const segments = [[]];
  let word = "";
  let inWord = false;
  let quote = null;

  const endWord = () => {
    if (inWord) segments.at(-1).push(word);
    word = "";
    inWord = false;
  };
  const addChar = (char) => {
    word += char;
    inWord = true;
  };

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    const next = command[i + 1] ?? "";

    if (quote === "'") {
      if (char === "'") quote = null;
      else addChar(char);
    } else if (char === "`" || (char === "$" && /[\w{(]/.test(next))) {
      throw new Denied("command substitution and variables aren't allowed");
    } else if (quote === '"') {
      if (char === '"') quote = null;
      else if (char === "\\" && /["\\$`]/.test(next)) addChar(command[++i]);
      else addChar(char);
    } else if (char === "'" || char === '"') {
      quote = char;
      inWord = true;
    } else if (char === "\\") {
      addChar(command[++i] ?? "");
    } else if (/\s/.test(char) && char !== "\n") {
      endWord();
    } else if (char === ">") {
      const redirect = command.slice(i - (inWord ? word.length : 0));
      const match = redirect.match(DISCARD_REDIRECT);
      if (!match || (inWord && !/^\d$/.test(word))) {
        throw new Denied("redirecting output to a file isn't allowed");
      }
      i += match[0].length - (inWord ? word.length : 0) - 1;
      word = "";
      inWord = false;
    } else if (char === "\n" || char === ";" || char === "|") {
      endWord();
      if (char === "|" && next === "|") i++;
      segments.push([]);
    } else if (char === "&" && next === "&") {
      endWord();
      i++;
      segments.push([]);
    } else if ("&<()".includes(char)) {
      throw new Denied(`"${char}" isn't allowed`);
    } else {
      addChar(char);
    }
  }
  if (quote) throw new Denied("the command has an unclosed quote");
  endWord();
  return segments.filter((words) => words.length > 0);
}

function isBlockedOption(arg, blocked) {
  return blocked.some(
    (option) => arg === option || arg.startsWith(`${option}=`),
  );
}

function isGitWriteOption(arg) {
  const name = arg.split("=")[0];
  return (
    name.length > 3 &&
    GIT_WRITE_OPTIONS.some((option) => option.startsWith(name))
  );
}

function checkGit(args) {
  // Global options such as -c can make git run any program, so only
  // --no-pager may come before the subcommand.
  const rest = args[0] === "--no-pager" ? args.slice(1) : args;
  const [subcommand, ...options] = rest;
  if (!GIT_READ_COMMANDS.has(subcommand)) {
    throw new Denied(`"git ${subcommand ?? ""}" isn't a read-only command`);
  }
  if (
    subcommand === "branch" &&
    options.some((option) => !BRANCH_LIST_OPTIONS.has(option))
  ) {
    throw new Denied("git branch may only list branches");
  }
  // git grep -O, also inside a group such as -nO, opens files in a program.
  const blocked = options.find(
    (option) =>
      isGitWriteOption(option) ||
      (subcommand === "grep" && /^-[a-zA-Z]*O/.test(option)),
  );
  if (blocked)
    throw new Denied(`"git ${subcommand} ${blocked}" can write or run code`);
}

function checkSegment([name, ...args]) {
  if (name === "git") checkGit(args);
  else if (!READ_COMMANDS.has(name)) {
    throw new Denied(`"${name}" isn't on the reviewer's read-only list`);
  }
  const blocked = args.find((arg) =>
    isBlockedOption(arg, BLOCKED_OPTIONS[name] ?? []),
  );
  if (blocked) throw new Denied(`"${name} ${blocked}" can write or run code`);
}

const { tool_input = {} } = JSON.parse(readFileSync(0, "utf8"));

try {
  parse(tool_input.command ?? "").forEach(checkSegment);
} catch (error) {
  if (!(error instanceof Denied)) throw error;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `The reviewer only reads: ${error.message}. Use git diff, git log, git show, git grep, grep or the Read tool instead.`,
      },
    }),
  );
}
