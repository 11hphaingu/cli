import { Option, Reader, TE, absordTE, pipe } from "yl-ddd-ts";
import { ProjectTypes, SetupEnvWork, TsConfig, UpdateDeps } from "./base";
import { match } from "ts-pattern";
import { mergeRight } from "ramda";

export type UpdateTsConfigFile = (
  config: TsConfig & {
    isSubModule: boolean;
    testDir: string;
  },
) => TE.TaskEither<Error, void>;

/**
 * Sets up TypeScript configuration for a project environment.
 *
 * This function uses a reader monad to inject dependencies for updating the TypeScript configuration
 * and dependencies. It adjusts the TypeScript configuration and installs necessary dependencies based
 * on the project type.
 *
 * @param context - An object containing the dependencies:
 *   - `updateTsConfigFile`: A port function has sideeffect of updating the TypeScript configuration file.
 *   - `updateDeps`: A port function has sideeffect of updating the project's dependencies.
 * @returns A function that takes `SetupEnvWork` and returns a `TaskEither` that resolves to `void` on success
 *          or an `Error` on failure.
 *
 * @example
 * ```typescript
 * const context = {
 *   updateTsConfigFile: (config) => TE.right(void 0), // Implementation of updateTsConfigFile
 *   updateDeps: (deps) => TE.right(void 0),           // Implementation of updateDeps
 * };
 *
 * const setupEnvWork: SetupEnvWork = {
 *   tsConfig: Option.some({ tsconfigPath: './tsconfig.json' }),
 *   projectType: ProjectTypes.node,
 *   isSubmodule: false,
 *   testDir: 'tests',
 * };
 *
 * const result = SetupTypescript(context)(setupEnvWork);
 * result().then(
 *   Either.match(
 *     (error) => console.error('Error setting up TypeScript', error),
 *     () => console.log('TypeScript setup successful')
 *   )
 * );
 * ```
 */
export const ExcuteSetupTypescript: Reader.Reader<
  { updateTsConfigFile: UpdateTsConfigFile; updateDeps: UpdateDeps },
  (setupEnvWork: SetupEnvWork) => TE.TaskEither<Error, void>
> =
  ({ updateTsConfigFile, updateDeps }) =>
  (setupEnvWork) =>
    pipe(
      setupEnvWork.tsConfig,
      Option.match(
        () => absordTE(TE.right<Error, null>(null)),
        (tsConfig) => {
          const mutualDeps = {
            "type-fest": "~4.15.0",
            typescript: "^5.4.5",
            "@types/jest": "^29.5.12",
          };
          const devDepsByProjectType = pipe(
            match(setupEnvWork.projectType)
              .with(ProjectTypes.node, () => ({
                "@types/node": "^18.16.6",
              }))
              .otherwise(() => ({})),
            mergeRight(mutualDeps),
          );
          return pipe(
            updateDeps({
              deps: {},
              devDeps: devDepsByProjectType,
            }),
            TE.bindTo("installDepsTs"),
            TE.bind("setupTsConfig", () =>
              updateTsConfigFile({
                ...tsConfig,
                isSubModule: setupEnvWork.isSubmodule,
                testDir: setupEnvWork.testDir,
              }),
            ),
            absordTE,
          );
        },
      ),
    );
