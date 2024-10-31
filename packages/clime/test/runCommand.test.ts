import { expect, test } from "vitest";
import {
  defineCommand,
  isDataResult,
  isErrorResult,
  isHelpResult,
  isVersionResult,
  printCommandHelp,
  runCommand,
} from "../src/index.js";

test("run a basic command", async () => {
  const cmd = defineCommand({
    name: "mycmd",
    description: "this is my first command",
    args: {
      number: {
        description: "a number",
        type: "number",
      },
    },
    run({ args }) {
      expect(typeof args.number).toBe("number");
      //                 ^?
      return args.number;
    },
  });

  const res = await runCommand(cmd, ["42"]);

  const isResult = isDataResult(res);

  expect(isResult).toBe(true);

  if (isResult) {
    expect(res.data).toBe(42);
  }
});

test("run the help command", async () => {
  const cmd = defineCommand({
    name: "mycmd",
    description: "this is my first command",
    args: {
      number: {
        description: "your number",
        type: "number",
      },
    },
    run({ args }) {
      expect(typeof args.number).toBe("number");
      //                 ^?
      return args.number;
    },
  });

  const res = await runCommand(cmd, ["42", "--help"]);

  const isHelp = isHelpResult(res);

  expect(isHelp).toBe(true);

  if (isHelp) {
    expect(res.help).toEqual({
      name: "mycmd",
      description: "this is my first command",
      depth: 0,
      args: [
        {
          name: "number",
          description: "your number",
          type: "a number",
          optional: false,
        },
      ],
    });
  }
});

test("run the version command", async () => {
  const cmd = defineCommand({
    name: "mycmd",
    description: "this is my first command",
    version: "0.1.0",
    args: {
      number: {
        description: "a number",
        type: "number",
      },
    },
    run({ args }) {
      expect(typeof args.number).toBe("number");
      //                 ^?
      return args.number;
    },
  });

  const res = await runCommand(cmd, ["42", "--version"]);

  const isVersion = isVersionResult(res);

  expect(isVersion).toBe(true);

  if (isVersion) {
    expect(res.version).toBe("0.1.0");
  }
});

test("run a command with errors", async () => {
  const cmd = defineCommand({
    name: "mycmd",
    description: "this is my first command",
    args: {
      number: {
        description: "a number",
        type: "number",
      },
    },
    run({ args }) {
      expect(typeof args.number).toBe("number");
      //                 ^?
      return args.number;
    },
  });

  const res = await runCommand(cmd, ["a"]);

  const isError = isErrorResult(res);

  expect(isError).toBe(true);

  if (isError) {
    expect(res.errors).toEqual([
      'argument "number": must be a number (was a string)',
    ]);
  }
});

test("run a basic command with options", async () => {
  const cmd = defineCommand({
    name: "mycmd",
    description: "this is my first command",
    args: {
      number: {
        description: "a number",
        type: "number",
      },
    },
    options: {
      reverse: {
        description: "reverse the provided number",
        type: "boolean",
      },
    },
    run({ args, options }) {
      expect(typeof args.number).toBe("number");
      //                 ^?
      expect(typeof options.reverse).toBe("boolean");
      //                    ^?

      if (options.reverse) {
        return -1 * args.number;
      }

      return args.number;
    },
  });

  const res = await runCommand(cmd, ["42", "--reverse"]);

  const isResult = isDataResult(res);

  expect(isResult).toBe(true);

  if (isResult) {
    expect(res.data).toBe(-42);
  }

  const res1 = await runCommand(cmd, ["42", "--reverse=true"]);

  const isResult1 = isDataResult(res1);

  expect(isResult1).toBe(true);

  if (isResult1) {
    expect(res1.data).toBe(-42);
  }

  const res2 = await runCommand(cmd, ["42", "--reverse=false"]);

  const isResult2 = isDataResult(res2);

  expect(isResult2).toBe(true);

  if (isResult2) {
    expect(res2.data).toBe(42);
  }
});
