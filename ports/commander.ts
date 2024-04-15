import { Command } from "commander";
import { readPkgJsonFile } from "core/helpers";
import figlet from "figlet";
import { identity, pipe } from "fp-ts/lib/function";
import { UnknownRecord } from "type-fest";
import { Either, TE } from "yl-ddd-ts";

const commandFactory = pipe(
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
            "--has-declaration-map [bool]",
            "do you need generate declaration mapping for type building",
            false,
          )
          .option(
            "--is-sub-module [bool]",
            "is your project a package within a monorepo yarn context ?",
            false,
          )
          .option(
            "--include-paths [paths...]",
            "paths should be percevied by typescript",
            [],
          )
          .description("setup typescript and eslint for nodejs project")
          .action((projectPath, opts) => {
            prepareTsAndEsl(projectPath, opts);
          }),
      identity,
    ),
  ),
);

// Effectful part
//
commandFactory().then(
  Either.match(
    (e) => {
      console.error("error ocurr when create command", e);
    },
    ({ program }) => {
      console.log(figlet.textSync("Yang Lake Tech CLI"));
      program.parse();
    },
  ),
);

const prepareTsAndEsl = (projectPath: string, options: UnknownRecord) => {
  console.log(
    `project path ${projectPath}, options ${JSON.stringify(options)}`,
  );
};
