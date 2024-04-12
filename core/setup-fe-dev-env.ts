import { ISetupDevEnv } from "./setup-fe-dev-env.base";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Option from "fp-ts/lib/Option";
import { PackageJson } from "type-fest";
import { mergeRight } from "ramda";

import { flip, flow, pipe } from "fp-ts/lib/function";
import path from "path";
import { FileSystem } from "./ports/filestystem-port";
import { JsonUtil } from "./ports/json";
import { ExecaPort } from "./ports/execa-port";
import { HBSTemplatePort } from "./ports/template-port";
import { tapExecTE } from "./fp/exeTE";

const addEslintDeps = (projectPath = process.cwd()) => {
  const pjPath = path.join(projectPath, "/package.json");
  return pipe(
    pjPath,
    FileSystem.readFile,
    TaskEither.chain(flow(JsonUtil.parse<PackageJson>, TaskEither.fromEither)),
    TaskEither.map(
      mergeRight({
        devDependencies: {
          "@typescript-eslint/eslint-plugin": "^6.7.0",
          "@typescript-eslint/parser": "^6.7.0",
          eslint: "^7.30.0",
          "eslint-config-prettier": "^8.3.0",
          "eslint-plugin-prettier": "^5.0.0",
          prettier: "^3.2.5",
        },
      }),
    ),
    TaskEither.map(JSON.stringify),
    TaskEither.chain(FileSystem.writeFile(pjPath)),
    TaskEither.chain(() =>
      ExecaPort.exec({
        file: "yarn install",
        option: Option.none,
        args: Option.none,
      }),
    ),
  );
};

const addEslintConfig =
  (projectPath = process.cwd()) =>
  (params: {
    buildFolder: Option.Option<string>;
    testFolder: Option.Option<string>;
    tsconfigPath: Option.Option<string>;
  }) => {
    const { buildFolder, testFolder, tsconfigPath } = params;
    const ESLINT_TEMPLATE_PATH = path.join(
      __dirname,
      "./resource/eslint-config-template.hbs",
    );
    return pipe(
      ESLINT_TEMPLATE_PATH,
      FileSystem.readFile,
      TaskEither.chain(
        flow(
          flip(HBSTemplatePort.compile)({
            buildFolder: Option.getOrElse(() => "dist")(buildFolder),
            testFolder: Option.getOrElse(() => "__test__")(testFolder),
            tsconfigPath: Option.getOrElse(() => "tsconfig.json")(tsconfigPath),
          }),
          TaskEither.fromEither,
        ),
      ),
      TaskEither.chain(
        pipe(
          projectPath,
          (pj) => path.join(pj, "./.eslintrc.js"),
          FileSystem.writeFile,
        ),
      ),
    );
  };

export const SetupDevEnv: ISetupDevEnv = {
  setupEslint: (params) =>
    pipe(
      params.projectPath,
      tapExecTE<string>(addEslintDeps),
      TaskEither.chain(
        tapExecTE<string>(
          flip(addEslintConfig)({
            buildFolder: params.buildFolder,
            testFolder: params.testFolder,
            tsconfigPath: params.tsconfigPath,
          }),
        ),
      ),
      TaskEither.mapError((e) => new Error("setup eslint failed " + e)),
      TaskEither.map(() => {}),
    ),
  setupTypescript: () => TaskEither.right(),
};
