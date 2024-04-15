import { ISetupDevEnv } from "./setup-fe-dev-env.base";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Option from "fp-ts/lib/Option";
import { PackageJson } from "type-fest";
import { mergeRight } from "ramda";

import { flow, pipe } from "fp-ts/lib/function";
import path from "path";
import { FileSystem } from "./ports/filestystem-port";
import { JsonUtil } from "./ports/json";
import { ExecaPort } from "./ports/execa-port";
import { tapExecTE } from "./fp/exeTE";
import { match } from "ts-pattern";
import { addDepsPkjson, buildFromTemplateFile, yarnInstall } from "./helpers";

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
  (params: { buildFolder: string; testFolder: string; tsconfigPath: string }) =>
  (projectPath = process.cwd()) => {
    const { buildFolder, testFolder, tsconfigPath } = params;
    return buildFromTemplateFile(
      projectPath,
      "./resource/eslint-config-template.hbs",
      "./eslintrc.js",
      {
        parser: "@typescript-eslint/parser",
        buildFolder,
        testFolder,
        tsconfigPath,
      },
    );
  };

enum ProjectTypes {
  node = "node",
  browser = "browser",
}

const installTypescriptDeps =
  (type: ProjectTypes = ProjectTypes.node) =>
  (projectPath: string) => {
    const mutualDeps = {
      "type-fest": "~4.15.0",
      typescript: "^5.4.5",
    };
    const devDepsByProjectType = pipe(
      match(type)
        .with(ProjectTypes.node, () => ({
          "@types/node": "^18.16.6",
        }))
        .otherwise(() => ({})),
      mergeRight(mutualDeps),
    );
    return pipe(
      {
        deps: {},
        devDeps: devDepsByProjectType,
      },
      addDepsPkjson(projectPath),
      TaskEither.chain(() => yarnInstall(projectPath)),
    );
  };

const addTypescriptConfig =
  (config: {
    buildDir: string;
    hasDeclarationMap: boolean;
    isSubModule: boolean;
    testDir: string;
    includePaths: string[];
  }) =>
  (projectPath: string = process.cwd()) => {
    const { buildDir, hasDeclarationMap, isSubModule, testDir, includePaths } =
      config;
    return buildFromTemplateFile(
      projectPath,
      "./resource/tsconfig.hbs.hbs",
      "./tsconfig.json",
      {
        buildDir,
        hasDeclarationMap,
        isSubModule,
        testDir,
        includePaths,
      },
    );
  };

export const SetupDevEnv: ISetupDevEnv = {
  setupEslint: (params) =>
    pipe(
      params.projectPath,
      tapExecTE<string>(addEslintDeps),
      TaskEither.chain(
        addEslintConfig({
          buildFolder: params.buildFolder,
          testFolder: params.testFolder,
          tsconfigPath: params.tsconfigPath,
        }),
      ),
    ),
  setupTypescript: (params) =>
    pipe(
      params.projectPath,
      tapExecTE(installTypescriptDeps()),
      TaskEither.chain(
        addTypescriptConfig({
          buildDir: params.buildDir,
          hasDeclarationMap: params.hasDeclarationMap,
          isSubModule: params.isSubmodule,
          testDir: params.testDir,
          includePaths: params.includePaths,
        }),
      ),
    ),
};
