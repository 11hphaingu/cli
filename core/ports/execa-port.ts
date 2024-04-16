import execa from "execa";
import * as Option from "fp-ts/lib/Option";
import { pipe } from "fp-ts/function";
import { Either, TE } from "yl-ddd-ts";

interface ExecaPort {
  exec: (params: {
    file: string;
    option: Option.Option<execa.Options<"utf8">>;
    args: Option.Option<string[]>;
    onStdout: (chunk: any) => void;
  }) => TE.TaskEither<Error, execa.ExecaChildProcess<string>>;
}

export const ExecaPort: ExecaPort = {
  exec: (params) =>
    pipe(
      Either.tryCatch(
        () =>
          execa(
            params.file,
            Option.getOrElseW(() => undefined)(params.args),
            Option.getOrElseW(() => undefined)(params.option),
          ),
        (e) => e as Error,
      ),
      Either.match(
        (e) => TE.left(e),
        (subprocess) =>
          pipe(
            TE.right(subprocess),
            TE.tapIO((sb) => () => {
              sb.stdout?.on?.("data", (chunk) => {
                params.onStdout(chunk);
              });
            }),
            TE.chain(() =>
              TE.tryCatch(
                async () => {
                  await subprocess;
                },
                (e) => e as Error,
              ),
            ),
            TE.map(() => subprocess),
          ),
      ),
    ),
};
