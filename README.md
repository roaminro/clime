STATUS: 🚧 Work in progress. 

USAGE RIGHTS: None granted; until a license is added, all rights are reserved.

-------------------------------------------

# **CLIME**
[![CI](https://github.com/roaminro/clime/actions/workflows/ci.yml/badge.svg)](https://github.com/roaminro/clime/actions/workflows/ci.yml)

Node.js **CLI**s **M**ade **E**asy

## Features
- Arguments and options parsing powered by Node.js's [parseArgs](https://nodejs.org/api/util.html#utilparseargsconfig) util
- Powerful arguments and options validation powered by [ArkType](https://arktype.io/)
- Nested sub-commands
- Auto-generated usage and help
- Commands easily testable

## Usage

```ts
// 1. Create a cli.ts file.

// 2. Import modules.
import {
  defineCommand,
  isErrorResult,
  isHelpResult,
  isVersionResult,
  runCommand,
} from "TBD";

// 3. Define your commands.
const cli = defineCommand({
    name: "calculator",
    description: "a simple calculator",
    subCommands: [
      defineCommand({
        name: "add",
        description: "add number a to number b",
        args: {
          a: {
            description: "number a",
            type: "number",
          },
          b: {
            description: "number b",
            type: "number",
          },
        },
        options: {
          print: {
            description: "print the equation",
            type: "boolean|undefined",
            short: 'p'
          },
        },
        run({ args, options }) {
          const result = args.a + args.b;

          if (options.print) {
            console.log(`${args.a} + ${args.b} = ${result}`)
          }

          return result;
        },
      }),
      defineCommand({
        name: "sub",
        description: "subtract number b from number a",
        args: {
          a: {
            description: "number a",
            type: "number",
          },
          b: {
            description: "number b",
            type: "number",
          },
        },
        run({ args }) {
          return args.a - args.b;
        },
      })
    ]
});

// 4. Call runCommand to process arguments and options.
const result = await runCommand(cli);

// 5. Process result.
// if cli was called with --help or -h
if (isHelpResult(result)) {
    // use provided formatter to print help
    // or, provide your own formatter
    printCommandHelp(result.help);
}
// if cli was called with --version or -help
else if (isVersionResult(result)) {
    console.log(result.version);
}
// if errors occured during the execution of the command
else if (isErrorResult(result)) {
    console.log(result.errors.join("\n"));
}
// otherwise, we can print the result of the command
else {
    console.log(result.data);
}

// 6. Run your cli (e.g.: using tsx)
// display general help: tsx cli.ts -h 
// display command specific help: tsx cli.ts add -h 
// display version: tsx cli.ts -v 
// call "add" command: tsx cli.ts add 4 2
// call "add" command: tsx cli.ts add 4 2 -p
// call "add" command: tsx cli.ts add 4 2 --print
```
