import { Command } from "commander";
import { readPkgJsonFile } from "core/helpers";
import { Progress, ProgressTrait } from "core/ports/progress-cli-port";
import { ISetupDevEnv, ProjectTypes } from "core/setup-fe-dev-env.base";
import figlet from "figlet";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { identity, pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { UnknownRecord } from "type-fest";
import { Either, Option, Reader, TE } from "yl-ddd-ts";

const commandFactory = (
  handler: (
    projectPath: string,
    options: UnknownRecord,
  ) => TE.TaskEither<unknown, unknown>,
) =>
  pipe(
    "./package.json",
    readPkgJsonFile,
    TE.map((pkgJson) => ({ pkgJson, program: new Command(pkgJson.name) })),
    TE.tapEither(({ pkgJson, program }) =>
      Either.tryCatch(
        () =>
          program
            .description("CLI for Yltech dev")
            .version(pkgJson.version || "1.0.1"),
        identity,
      ),
    ),
    TE.tapEither(({ program }) =>
      Either.tryCatch(
        () =>
          program
            .command("setup-eslint-ts")
            .argument("[project-path]", ".")
            .option("-bD, --build-dir [string]", "path of build Dir", "dist")
            .option("-tD, --test-dir [string]", "path of test Dir", "__test__")
            .option(
              "-tscnf, --tsconfigpath [string]",
              "tsconfig path for eslint parser",
              "tsconfig.json",
            )
            .option(
              "--project-type [node|browser]",
              "your project type",
              "node",
            )
            .option("--no-ts", "dont use ts ?")
            .option(
              "--has-declaration-map",
              "do you need generate declaration mapping for type building",
            )
            .option(
              "--is-sub-module",
              "is your project a package within a monorepo yarn context ?",
            )
            .option(
              "--include-paths [paths...]",
              "paths should be percevied by typescript",
              [],
            )
            .description("setup typescript and eslint for nodejs project")
            .action((projectPath, opts) => {
              handler(projectPath, opts)().then(
                Either.match((er) => {
                  program.error(`\n Error occured in handler: ${er}`);
                }, identity),
              );
            }),
        identity,
      ),
    ),
  );

const prepareTsAndEslWith =
  <P extends Progress>(
    progressTrait: ProgressTrait<P>,
    setupDevEnv: ISetupDevEnv,
  ) =>
  (projectPath: string, options: UnknownRecord) => {
    const progress = progressTrait.construct(1, "setup eslint", 2);
    return pipe(
      progress,
      progressTrait.start,
      TE.fromIO,
      TE.bindTo("progress"),
      TE.bind("setupEslintResult", (params) =>
        setupDevEnv.setupEslint({
          projectPath,
          hasTypescript: !options["noTs"],
          buildFolder: options["buildDir"] as string,
          testFolder: options["testFolder"] as string,
          tsconfigPath: options["tsconfigpath"] as string,
          onStdOut: (chunk: any) =>
            progressTrait.updateProgress({
              currentJob: Option.some(`setup eslint: ${chunk}`),
              currentStep: Option.none,
              color: Option.none,
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
                  projectPath,
                  buildDir: options["buildDir"] as string,
                  testDir: options["testFolder"] as string,
                  hasDeclarationMap: options["hasDeclarationMap"] as boolean,
                  isSubmodule: options["isSubmodule"] as boolean,
                  includePaths: options["includePaths"] as string[],
                  onStdOut: (chunk: any) =>
                    progressTrait.updateProgress({
                      currentJob: Option.some(
                        `setup eslint -> setup typescript: ${chunk}`,
                      ),
                      currentStep: Option.none,
                      color: Option.none,
                    })(params.progress)(),
                  // TODO: should parsing projectType
                  projectType: options["projectType"] as ProjectTypes,
                }),
              ),
            ),
          ),
      ),
      TE.tapIO((a) => pipe(a.progress, progressTrait.succeed)),
    );
  };

export const commanderInstance: Reader.Reader<
  {
    progressTrait: ProgressTrait<any>;
    setupDevEnv: ISetupDevEnv;
  },
  TaskEither<unknown, unknown>
> = ({ progressTrait, setupDevEnv }) => {
  return pipe(
    commandFactory(prepareTsAndEslWith(progressTrait, setupDevEnv)),
    TE.map((c) => c.program),
    TE.tapIO((p) => () => {
      console.log(figlet.textSync("Yang Lake Tech CLI"));
      p.parse();
    }),
  );
};
