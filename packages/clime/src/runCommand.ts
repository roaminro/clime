import { parseArgs } from "node:util";
import { type Type, type } from "arktype";
import type {
  CommandHelp,
  CommandHelpArg,
  Result,
  VerifiedCommand,
} from "./types.js";
import { calculateLevenshteinDistance, debug } from "./utils.js";

function generateCommandHelp<const Args, const Opts, const RunRet>(
  command: VerifiedCommand<Args, Opts, RunRet>,
  commandDepth = 0,
): CommandHelp {
  const args: CommandHelpArg[] = Object.entries(command.args || {}).map(
    ([name, arg]) => {
      // @ts-expect-error
      // error: Type instantiation is excessively deep and possibly infinite.
      const inType = type(arg.type).in;

      return {
        name,
        description: arg.description,
        type: inType.description,
        // we consider an argument optional if it can be undefined
        optional: type.undefined.extends(inType),
      };
    },
  );

  const commandHelp: CommandHelp = {
    name: command.name,
    description: command.description,
    depth: commandDepth,
  };

  if (command.args) {
    commandHelp.args = args;
  }

  if (command.examples) {
    commandHelp.examples = command.examples;
  }

  if (command.subCommands?.length) {
    commandHelp.subCommands = [];

    for (const subCommand of command.subCommands) {
      commandHelp.subCommands.push(
        generateCommandHelp(subCommand, commandDepth + 1),
      );
    }
  }

  return commandHelp;
}

export async function runCommand<const Args, const Opts, const RunRet>(
  command: VerifiedCommand<Args, Opts, RunRet>,
  argv?: string[],
): Promise<Result<RunRet>> {
  const parsedArgs = parseArgs({
    args: argv,
    tokens: true,
    allowPositionals: true,
    strict: false,
  });

  const args = parsedArgs.tokens.filter((tkn) => tkn.kind === "positional");

  // get options and process default flags
  let printHelp = false;
  let printVersion = false;
  const options = parsedArgs.tokens.filter((tkn) => {
    // TODO: should we remove the "reserved" options from the parsed options?
    if (tkn.kind === "option") {
      if (["help", "h"].includes(tkn.name)) {
        printHelp = true;
      }
      if (["version", "v"].includes(tkn.name)) {
        printVersion = true;
      }
    }

    return tkn.kind === "option";
  });

  if (printVersion) {
    return {
      version: command.version ?? "",
    };
  }

  const firstArg = args.at(0);

  if (firstArg) {
    // check if we're calling a subcommand
    const subCommand = command.subCommands?.find(
      (cmd) => cmd.name === firstArg.value,
    );

    if (subCommand) {
      // call subcommand with rest of args and options
      // TODO: optimize args/options passing to avoid calling parseArgs multiple times
      // @ts-expect-error we do not know yet the RunRet type here, hence the Result<unknown>
      return runCommand(subCommand, [
        ...args
          .filter((arg) => arg.index > firstArg.index)
          .map((arg) => arg.value),
        ...options.map((opt) => opt.rawName),
      ]);
    }

    if (command.subCommands?.length) {
      // if the subcommand provided does not exist,
      // run Levenshtein algo to try to find the closest matching command
      const subCommands = command.subCommands.map((subCmd) => {
        return {
          name: subCmd.name,
          levenshteinScore: calculateLevenshteinDistance(
            firstArg.value,
            subCmd.name,
          ),
        };
      });

      // order subCommands by levenshtein score ascending
      subCommands.sort((a, b) => a.levenshteinScore - b.levenshteinScore);

      // and only keep the ones with the lowest score
      const similarSubCommands = subCommands
        .filter(
          (subCmd) =>
            subCmd.levenshteinScore === subCommands[0].levenshteinScore,
        )
        .map((subCmd) => subCmd.name);

      return {
        errors: [
          `Command "${
            firstArg.value
          }" does not exist, did you mean "${similarSubCommands.join(
            '" or "',
          )}"?`,
        ],
      };
    }
  } else if (command.subCommands?.length && !printHelp) {
    return {
      errors: [
        `A command must be provided, add "--help" or "-h" to get more information about the available commands.`,
      ],
    };
  }

  if (debug.enabled) {
    debug(`Processing command "${command.name}" with raw args and options:`);
    console.log("args:", args);
    console.log("options:", options);
  }

  if (printHelp) {
    return {
      help: generateCommandHelp(command),
    };
  }

  // process arguments
  const invalidArguments: string[] = [];
  const parsedArguments: Record<string, unknown> = {};

  let parsedType: Type;
  let rawValue: undefined | string;
  let value: undefined | string | boolean | number | bigint;
  let parsedValue: unknown;

  for (const [index, [argName, argDef]] of Object.entries(
    command.args || {},
  ).entries()) {
    parsedType = type(argDef.type);

    // value is of type any here as it first is of type string | undefined,
    rawValue = args[index]?.value;
    value = rawValue;
    // but we then try to "cast" that value into its native type when needed
    if (rawValue !== undefined) {
      try {
        if (type.boolean.extends(parsedType.in)) {
          value = ["true", "1", "on"].includes(rawValue.toLowerCase());
        } else if (type.number.extends(parsedType.in)) {
          value = Number(rawValue);
          // Number.NaN is considered a number so it wouldn't trigger an Arktype error
          if (Number.isNaN(value)) {
            value = rawValue;
          }
        } else if (type.bigint.extends(parsedType.in)) {
          value = BigInt(rawValue);
        }
      } catch (error) {
        // TODO: rethrow error here?
        if (debug.enabled) {
          console.error(
            `error thrown during parsing of arg "${argName}" with value ${rawValue}`,
          );
          console.error(error);
        }
      }
    }

    parsedValue = parsedType(value);

    if (parsedValue instanceof type.errors) {
      invalidArguments.push(`argument "${argName}": ${parsedValue.summary}`);
      debug(`${index}:${argName}: parsing error: ${parsedValue.summary}`);
    } else {
      debug(`${index}:${argName}: ${parsedValue}`);
      parsedArguments[argName] = parsedValue;
    }
  }

  // process options
  const invalidOptions: string[] = [];
  const parsedOptions: Record<string, unknown> = {};

  for (const [index, [optName, optDef]] of Object.entries(
    command.options || {},
  ).entries()) {
    parsedType = type(optDef.type);

    const option = options.find(
      (opt) => opt.name === optName || opt.name === optDef.short,
    );

    // value is of type any here as it first is of type string | undefined,
    rawValue = option?.value;
    value = rawValue;
    // but we then try to "cast" that value into its native type when needed
    if (rawValue !== undefined) {
      try {
        if (type.boolean.extends(parsedType.in)) {
          value = ["true", "1", "on"].includes(rawValue.toLowerCase());
        } else if (type.number.extends(parsedType.in)) {
          value = Number(rawValue);
          // Number.NaN is considered a number so it wouldn't trigger an Arktype error
          if (Number.isNaN(value)) {
            value = rawValue;
          }
        } else if (type.bigint.extends(parsedType.in)) {
          value = BigInt(rawValue);
        }
      } catch (error) {
        // TODO: rethrow error here?
        if (debug.enabled) {
          console.error(
            `error thrown during parsing of option "--${optName}${optDef.short ? `/-${optDef.short}` : ""}" with value ${rawValue}`,
          );
          console.error(error);
        }
      }
    }
    // if the option was passed, it's of type boolean and its value is undefined
    else if (option && type.boolean.extends(parsedType.in)) {
      value = true;
    }

    parsedValue = parsedType(value);

    if (parsedValue instanceof type.errors) {
      invalidOptions.push(
        `option "--${optName}${optDef.short ? `/-${optDef.short}` : ""}": ${parsedValue.summary}`,
      );
      debug(`${index}:${optName}: parsing error: ${parsedValue.summary}`);
    } else {
      debug(`${index}:${optName}: ${parsedValue}`);
      parsedOptions[optName] = parsedValue;
    }
  }

  if (invalidArguments.length || invalidOptions.length) {
    return {
      errors: [...invalidArguments, ...invalidOptions],
    };
  }

  // TODO: catch errors that may be thrown during the execution of the command run?
  if (typeof command.beforeRun === "function") {
    // @ts-expect-error we do not know the args type here, so we use unknown
    // error: Type 'Record<string, unknown>' is not assignable to type 'never'
    await command.beforeRun({ args: parsedArguments, options: parsedOptions });
  }

  let data: RunRet | undefined;
  if (typeof command.run === "function") {
    // @ts-expect-error we do not know the args type here, so we use unknown
    // error: Type 'Record<string, unknown>' is not assignable to type 'never'
    data = await command.run({ args: parsedArguments, options: parsedOptions });
  }

  if (typeof command.afterRun === "function") {
    // @ts-expect-error we do not know the args type here, so we use unknown
    // error: Type 'Record<string, unknown>' is not assignable to type 'never'
    await command.afterRun({ args: parsedArguments, options: parsedOptions });
  }

  return {
    data,
  };
}
