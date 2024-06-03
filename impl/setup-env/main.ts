import { ProgressSpinnerTrait } from "core/ports/progress-cli-port.spinner";
import {
  ProjectTypes,
  SetupEnvWork,
  getProjectSpecificType,
} from "core/setup-env/base";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { UnknownRecord } from "type-fest";
import { Option, TE } from "yl-ddd-ts";
import { SetupDevEnvWithExeca } from "./execa";

export const prepareTsAndEslWith = (
  projectPath: string,
  options: UnknownRecord,
) => {
  const progressTrait = ProgressSpinnerTrait;
  const setupDevEnv = SetupDevEnvWithExeca;
  const progress = progressTrait.construct(1, "setup eslint", 2);
  const setupEnvWork: SetupEnvWork = {
    projectPath,
    isSubmodule: options["isSubmodule"] as boolean,
    tsConfig: options["noTs"]
      ? Option.none
      : Option.some({
          declarationMapping: options["hasDeclarationMap"] as boolean,
          includePaths: options["includePaths"] as string[],
          tsconfigPath: options["tsconfigpath"] as string,
        }),
    buildDir: options["buildDir"] as string,
    testDir: options["testFolder"] as string,
    projectType: options["projectType"] as ProjectTypes,
    projectSpecificType: getProjectSpecificType(
      options["projectSpecificType"] as string,
    ),
  };
  return pipe(
    progress,
    progressTrait.start,
    TE.fromIO,
    TE.bindTo("progress"),
    TE.bind("setupPackageSetting", (params) =>
      setupDevEnv.setupProjectModule({
        setupEnvWork,
        onStdOut: (chunk: any) =>
          progressTrait.updateProgress({
            currentJob: Option.some(`setup eslint: ${chunk}`),
            currentStep: Option.none,
            color: Option.some("orange"),
          })(params.progress)(),
      }),
    ),
    TE.bind("setupEslintResult", (params) =>
      setupDevEnv.setupEslint({
        setupEnvWork,
        onStdOut: (chunk: any) =>
          progressTrait.updateProgress({
            currentJob: Option.some(`setup eslint: ${chunk}`),
            currentStep: Option.some(1),
            color: Option.some("blue"),
          })(params.progress)(),
      }),
    ),
    TE.bind("setupTypescriptResult", (params) =>
      // two case, if config with noTs, dont need to execute the logic of setupTs
      match(options["noTs"] as boolean)
        .with(true, () => TE.right(null))
        .otherwise(() =>
          pipe(
            params.progress,
            progressTrait.updateProgress({
              currentStep: Option.some(2),
              currentJob: Option.some("setup eslint -> setup typescript"),
              color: Option.some("green"),
            }),
            TE.fromIO,
            TE.map((newProgress) => ({ ...params, progress: newProgress })), // update progress status
            TE.mapError((e) => e as Error),
            TE.chain(() =>
              setupDevEnv.setupTypescript({
                setupEnvWork,
                onStdOut: (chunk: any) =>
                  progressTrait.updateProgress({
                    currentJob: Option.some(
                      `setup eslint -> setup typescript: ${chunk}`,
                    ),
                    currentStep: Option.none,
                    color: Option.none,
                  })(params.progress)(),
                // TODO: should parsing projectType
              }),
            ),
          ),
        ),
    ),
    TE.tapIO((a) => pipe(a.progress, progressTrait.succeed)),
  );
};
