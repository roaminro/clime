import type { Type, type } from "arktype";

export type Argument<T> = {
  description: string;
  type: type.validate<T>;
};

export type Arguments<T> = {
  [K in keyof T]: Argument<T[K]>;
};

export type Option<T> = {
  description: string;
  short?: string;
  type: type.validate<T>;
};

export type Options<T> = {
  [K in keyof T]: Option<T[K]>;
};

export type RunCommandContext<Arg, Opts> = {
  args: Type<type.infer<Arg>>["infer"];
  options: Type<type.infer<Opts>>["infer"];
};

export type Command<Args, Opts, RunRet> = {
  name: string;
  description: string;
  version?: string;
  examples?: string;
  args?: Arguments<Args>;
  options?: Options<Opts>;
  subCommands?: Command<unknown, unknown, unknown>[];
  beforeRun?: (context: RunCommandContext<Args, Opts>) => void | Promise<void>;
  afterRun?: (context: RunCommandContext<Args, Opts>) => void | Promise<void>;
  run?: (context: RunCommandContext<Args, Opts>) => RunRet;
};

export type VerifiedCommand<Args, Opts, RunRet> = Omit<
  Command<Args, Opts, RunRet>,
  "args" | "options" | "beforeRun" | "afterRun" | "run"
> & {
  args?: Record<string, Argument<unknown>>;
  options?: Record<string, Option<unknown>>;
  beforeRun?(
    context: RunCommandContext<unknown, unknown>,
  ): void | Promise<void>;
  afterRun?(context: RunCommandContext<unknown, unknown>): void | Promise<void>;
  run?(context: RunCommandContext<unknown, unknown>): RunRet;
};

export type CommandHelpArg = {
  name: string;
  description: string;
  type: string;
  optional: boolean;
};

export type OptionHelpArg = {
  name: string;
  description: string;
  short?: string;
  type: string;
};

export type CommandHelp = {
  name: string;
  description: string;
  depth: number;
  args?: CommandHelpArg[];
  options?: OptionHelpArg[];
  subCommands?: CommandHelp[];
  examples?: string;
};

export type ErrorResult = {
  errors: string[];
};

export type DataResult<T> = {
  data?: T;
};

export type HelpResult = {
  help: CommandHelp;
};

export type VersionResult = {
  version: string;
};

export type Result<T = unknown> =
  | ErrorResult
  | DataResult<T>
  | HelpResult
  | VersionResult;
