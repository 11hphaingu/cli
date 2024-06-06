import { Command } from "commander";
import { prepareTsAndEslWith } from "impl/setup-env/main";
import { Either } from "yl-ddd-ts";

export const initSetupEslintCommand = (program: Command) => {
  return Either.tryCatch(
    () =>
      program
        .command("setup-eslint-ts")
        .argument("[project-path]", "project path", ".")
        .option("-bD, --build-dir [string]", "path of build Dir", "dist")
        .option("-tD, --test-dir [string]", "path of test Dir", "__test__")
        .option(
          "-tscnf, --tsconfigpath [string]",
          "tsconfig path for eslint parser",
          "tsconfig.json",
        )
        .option("--project-type [node|browser]", "your project type", "node")
        .option(
          "--project-specific-type [cli|module|service|web]",
          "your domain project type",
          "service",
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
          prepareTsAndEslWith(projectPath, opts)().then(
            Either.match(
              (er) => {
                program.error(`\n Error occured in handler: ${er}`);
              },
              (e) => e,
            ),
          );
        }),
    (e) => e,
  );
};
