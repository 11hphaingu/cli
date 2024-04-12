import { execa, Options, ExecaReturnValue } from "execa";
import * as Option from "fp-ts/lib/Option";
import * as TaskEither from "fp-ts/lib/TaskEither";

interface ExecaPort {
  exec: (params: {
    file: string;
    option: Option.Option<Options<"utf8">>;
    args: Option.Option<string[]>;
  }) => TaskEither.TaskEither<Error, ExecaReturnValue<string>>;
}

export const ExecaPort: ExecaPort = {
  exec: (params) =>
    TaskEither.tryCatch(
      () =>
        execa(
          params.file,
          Option.getOrElseW(() => undefined)(params.args),
          Option.getOrElseW(() => undefined)(params.option),
        ),
      (e) => e as Error,
    ),
};
