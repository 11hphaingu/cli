import { mergeDeepRight } from "ramda";
import { Option, Reader, pipe, TE, absordTE } from "yl-ddd-ts";
import {
  PkgCfgDeps,
  SetupEnvWork,
  UpdateDeps,
  UpdateEslint,
  isHasTs,
} from "./base";

/**
 * Sets up ESLint configuration for a project environment.
 *
 * This function uses a reader monad to inject dependencies for updating ESLint configuration
 * and dependencies. It determines if TypeScript is present in the environment and adjusts
 * the ESLint configuration and dependencies accordingly.
 *
 * @param context - An object containing the dependencies:
 *   - `updateEslint`: A port function to update the ESLint configuration.
 *   - `updateDeps`: A function to update the project's dependencies (update package.json, run install deps).
 * @returns A function that takes `SetupEnvWork` and returns a `TaskEither` that resolves to `void` on success
 *          or an `Error` on failure.
 *
 * @example
 * ```typescript
 * const context = {
 *   updateEslint: (config) => TE.right(void 0), // Implementation of updateEslint
 *   updateDeps: (deps) => TE.right(void 0),     // Implementation of updateDeps
 * };
 *
 * const setupEnvWork: SetupEnvWork = {
 *   tsConfig: Option.some({ tsconfigPath: './tsconfig.json' }),
 *   buildDir: 'dist',
 *   testDir: 'tests',
 * };
 *
 * const result = executeSetupEslint(context)(setupEnvWork);
 * result().then(
 *   Either.match(
 *     (error) => console.error('Error setting up ESLint', error),
 *     () => console.log('ESLint setup successful')
 *   )
 * );
 * ```
 */

export const executeSetupEslint: Reader.Reader<
  {
    updateEslint: UpdateEslint;
    updateDeps: UpdateDeps;
  },
  (setupEnvWork: SetupEnvWork) => TE.TaskEither<Error, void>
> =
  ({ updateEslint, updateDeps }) =>
  (setupEnvWork) => {
    const hasTs = isHasTs(setupEnvWork);
    const addPkgParser = (deps: PkgCfgDeps) =>
      hasTs
        ? mergeDeepRight(deps, {
            "@typescript-eslint/eslint-plugin": "^6.7.0",
            "@typescript-eslint/parser": "^6.7.0",
          })
        : mergeDeepRight(deps, {
            "@babel/eslint-parser": "7.24.1",
          });
    const deps: PkgCfgDeps = pipe(
      {
        deps: {},
        devDeps: {
          eslint: "^7.30.0",
          "eslint-config-prettier": "^8.3.0",
          "eslint-plugin-prettier": "^5.0.0",
          prettier: "^3.2.5",
        },
      },
      addPkgParser,
    );
    const whichParser = hasTs
      ? "@typescript-eslint/parser"
      : "@babel/eslint-parser";

    const parseOpts = pipe(
      setupEnvWork.tsConfig,
      Option.match(
        () => ({}),
        (tsC) => ({
          project: tsC.tsconfigPath,
          sourceType: "module",
        }),
      ),
    );
    return pipe(
      updateEslint({
        parser: whichParser,
        buildFolder: setupEnvWork.buildDir,
        testFolder: setupEnvWork.testDir,
        parseOpts,
      }),
      TE.bindTo("updateEslint"),
      TE.bind("updateDeps", () => updateDeps(deps)),
      absordTE,
    );
  };
