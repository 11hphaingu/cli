import { Either, TE, pipe } from "yl-ddd-ts";

interface Recur<R> {
  recur: boolean;
  args?: any[];
  value?: R;
}

// Recur :: a -> Result a b
export const Recur = (...args: any[]) => ({ recur: true, args });

// Return :: b -> Result a b
export const Return = (value: any) => ({ recur: false, value });

interface Loopable<R> {
  (...args: any[]): TE.TaskEither<Error, Recur<R>>;
}

// loop :: (a -> Result a b) -> a -> b
export const loop =
  <R>(func: Loopable<R>) =>
  (...args: any[]) =>
    TE.tryCatch(
      async () => {
        let result = await func(...args)();
        while (
          pipe(
            result,
            Either.match(
              (e) => {
                throw e;
              },
              (r) => r.recur,
            ),
          )
        ) {
          result = await func(
            ...pipe(
              result,
              Either.map((r) => r.args || []),
              Either.getOrElse(() => [] as any[]),
            ),
          )();
        }
        const ultimateResult = pipe(
          result,
          Either.match(
            (e) => {
              throw e;
            },
            (r) => r,
          ),
        );
        return ultimateResult.value;
      },
      (e) => e as Error,
    );

const ofTE =
  <R>(f: (...args: any[]) => TE.TaskEither<Error, R>) =>
  (
    condition: (r: R) => boolean,
    getUpcomingArgs: (r: R) => any[],
  ): Loopable<R> =>
  (...args: any[]) => {
    const result = f(...args);
    return pipe(
      result,
      TE.map((r) => (condition(r) ? Recur(...getUpcomingArgs(r)) : Return(r))),
    );
  };

export const LoopableTrait = {
  ofTE,
  loop,
};
