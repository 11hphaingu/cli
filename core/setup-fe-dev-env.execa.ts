import { ISetupDevEnv, ProjectTypes } from "./setup-fe-dev-env.base";
import * as TaskEither from "fp-ts/lib/TaskEither";
import { mergeDeepRight, mergeRight } from "ramda";

import { pipe } from "fp-ts/lib/function";
import { tapExecTE } from "./fp/exeTE";
import { match } from "ts-pattern";
import {
  AddDepsPkjsonParams,
  addDepsPkjson,
  buildFromTemplateFile,
  yarnInstall,
} from "./helpers";
import { setupModule } from "./setup-project-tool.execa";

const addEslintDeps =
  (projectPath = process.cwd(), isHaveTs = true) =>
  (onStdout: (chunk: any) => void) => {
    const addPkgParser = (isHaveTs: boolean) => (deps: AddDepsPkjsonParams) =>
      isHaveTs
        ? mergeDeepRight(deps, {
            "@typescript-eslint/eslint-plugin": "^6.7.0",
            "@typescript-eslint/parser": "^6.7.0",
          })
        : mergeDeepRight(deps, {
            "@babel/eslint-parser": "7.24.1",
          });
    return pipe(
      {
        deps: {},
        devDeps: {
          eslint: "^7.30.0",
          "eslint-config-prettier": "^8.3.0",
          "eslint-plugin-prettier": "^5.0.0",
          prettier: "^3.2.5",
        },
      },
      addPkgParser(isHaveTs),
      addDepsPkjson(projectPath),
      TaskEither.chain(() => yarnInstall(projectPath, onStdout)),
    );
  };

const addEslintConfig =
  (params: {
    buildFolder: string;
    testFolder: string;
    tsconfigPath: string;
    hasTs: boolean;
  }) =>
  (projectPath = process.cwd()) => {
    const { buildFolder, testFolder, tsconfigPath, hasTs } = params;

    const whichParser = (conf: { hasTs: boolean }) =>
      conf.hasTs ? "@typescript-eslint/parser" : "@babel/eslint-parser";

    const parseOpts = (conf: { hasTs: boolean }) =>
      conf.hasTs
        ? {
            project: tsconfigPath,
            sourceType: "module",
          }
        : {};

    return buildFromTemplateFile(
      projectPath,
      "./resource/eslint-config-template.hbs",
      "./eslintrc.js",
      {
        parser: whichParser({ hasTs }),
        buildFolder,
        testFolder,
        parseOpts: parseOpts({ hasTs }),
      },
    );
  };

const installTypescriptDeps =
  (type: ProjectTypes = ProjectTypes.node) =>
  (projectPath: string) =>
  (onStdout: (chunk: any) => void) => {
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
      TaskEither.chain(() => yarnInstall(projectPath, onStdout)),
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
      "./resource/tsconfig.hbs",
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

export const SetupDevEnvWithExeca: ISetupDevEnv = {
  setupEslint: (params) =>
    pipe(
      params.projectPath,
      tapExecTE<string>((pP) => addEslintDeps(pP)(params.onStdOut)),
      TaskEither.chain(
        addEslintConfig({
          buildFolder: params.buildFolder,
          testFolder: params.testFolder,
          tsconfigPath: params.tsconfigPath,
          hasTs: params.hasTypescript,
        }),
      ),
    ),
  setupTypescript: (params) =>
    pipe(
      params.projectPath,
      tapExecTE((pP) =>
        installTypescriptDeps(params.projectType)(pP)(params.onStdOut),
      ),
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
  setupProjectModule: setupModule,
};
