import { expect, test } from "vitest";
import { type Command, defineCommand } from "../src/index.js";

test("define a command", () => {
  const cmdDef: Command<unknown, unknown, unknown> = {
    name: "mycmd",
    description: "this is my first command",
    run() {
      console.log("Hello, World!");
    },
  };

  const cmd = defineCommand(cmdDef);

  expect(cmd).toEqual(cmdDef);
});
