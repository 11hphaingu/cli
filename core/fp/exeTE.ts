import * as TaskEither from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { UnknownRecord } from "type-fest";

type ReturnTE<T> = T extends TaskEither.TaskEither<any, infer A> ? A : never;

interface ExecTE {
  <T extends UnknownRecord>(
    main: <R extends UnknownRecord>(
      params: T,
    ) => TaskEither.TaskEither<unknown, R>,
  ): (
    params: T,
  ) => TaskEither.TaskEither<unknown, T & ReturnTE<ReturnType<typeof main>>>;
}

interface TapExecTE {
  <T>(
    main: (params: T) => TaskEither.TaskEither<unknown, unknown>,
  ): (params: T) => TaskEither.TaskEither<unknown, T>;
}

export const execTE: ExecTE = (main) => (params) => {
  return pipe(
    params,
    main,
    TaskEither.map((r) => ({ ...r, ...params })),
  );
};

export const tapExecTE: TapExecTE = (main) => (params) =>
  pipe(
    params,
    main,
    TaskEither.map(() => params),
  );
