import { debuglog } from "node:util";
import type {
  CommandHelp,
  DataResult,
  ErrorResult,
  HelpResult,
  Result,
  VersionResult,
} from "./types.js";

export const debug = debuglog("clime");

export function isErrorResult(result: Result): result is ErrorResult {
  return "errors" in result;
}

export function isHelpResult(result: Result): result is HelpResult {
  return "help" in result;
}

export function isVersionResult(result: Result): result is VersionResult {
  return "version" in result;
}

export function isDataResult<T>(result: Result): result is DataResult<T> {
  return "data" in result;
}

/**
 * @description The Levenshtein distance between represents how many modifications (substitutions/insertions/deletions) are needed for 2 strings to be equal
 * @copyright https://gist.github.com/keesey/e09d0af833476385b9ee13b6d26a2b84
 * @link https://en.wikipedia.org/wiki/Levenshtein_distance
 **/
export function calculateLevenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) {
    return bn;
  }
  if (bn === 0) {
    return an;
  }
  const matrix = new Array<number[]>(bn + 1);
  let row: number[];
  for (let i = 0; i <= bn; ++i) {
    row = matrix[i] = new Array<number>(an + 1);
    row[0] = i;
  }
  const firstRow = matrix[0];
  for (let j = 1; j <= an; ++j) {
    firstRow[j] = j;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] =
          Math.min(
            matrix[i - 1][j - 1], // substitution
            matrix[i][j - 1], // insertion
            matrix[i - 1][j], // deletion
          ) + 1;
      }
    }
  }
  return matrix[bn][an];
}

export function printCommandHelp(commandHelp: CommandHelp) {
  // usage
  let usage = "";

  if (commandHelp.subCommands?.length) {
    usage += `Usage: ${commandHelp.name} <command>`;
  } else if (commandHelp.depth === 0) {
    usage += `Usage: ${commandHelp.name}`;
  } else {
    usage += `${commandHelp.name}`;
  }

  let longestArgName = 0;
  if (commandHelp.args?.length) {
    for (const arg of commandHelp.args) {
      longestArgName = Math.max(longestArgName, arg.name.length);
      if (arg.optional) {
        usage += ` [${arg.name}]`;
      } else {
        usage += ` <${arg.name}>`;
      }
    }
  }

  print(`${usage}`, commandHelp.depth);

  // description
  if (commandHelp.depth > 0) {
    print(`  ${commandHelp.description}`, commandHelp.depth);
  } else {
    print(`\n\n${commandHelp.description}`, commandHelp.depth);
  }

  // commands
  if (commandHelp.subCommands?.length) {
    print("\n\nCommands:\n", commandHelp.depth);

    for (const subCommand of commandHelp.subCommands) {
      printCommandHelp(subCommand);
    }
  }

  // arguments
  if (commandHelp.depth === 0 && commandHelp.args?.length) {
    print("\n\nArguments:", commandHelp.depth);

    for (const arg of commandHelp.args) {
      print(
        `\n   ${arg.name.padEnd(longestArgName)}\t${arg.description} (${
          arg.type
        })`,
        commandHelp.depth,
      );
    }
  }

  // examples
  if (commandHelp.depth === 0 && commandHelp.examples) {
    print(`\n\nExamples:\n${commandHelp.examples}`, commandHelp.depth);
  }

  print("\n");
}

export function print(line: string, padding = 0) {
  process.stdout.write(`${new Array(padding).fill("\t").join("")}${line}`);
}
