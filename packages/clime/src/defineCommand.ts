import type { Command, VerifiedCommand } from "./types.js";

function verifyCommand<const Args, const Opts, const RunRet>(
  command: Command<Args, Opts, RunRet>,
  isSubCommand = false,
): string[] {
  const errors: string[] = [];

  if (command.run && command.subCommands?.length) {
    errors.push(
      `${isSubCommand ? "subCommand" : "command"} "${
        command.name
      }" can only have "run" OR "subCommands" defined at the same time.`,
    );
  }

  if (command.args && command.subCommands?.length) {
    errors.push(
      `${isSubCommand ? "subCommand" : "command"} "${
        command.name
      }" can only have "arguments" OR "subCommands" defined at the same time.`,
    );
  }

  for (const subCommand of command.subCommands || []) {
    errors.push(...verifyCommand(subCommand));
  }

  return errors;
}

export function defineCommand<const Args, const Opts, const RunRet>(
  command: Command<Args, Opts, RunRet>,
): VerifiedCommand<Args, Opts, RunRet> {
  const errors = verifyCommand(command);

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  return command as VerifiedCommand<Args, Opts, RunRet>;
}
