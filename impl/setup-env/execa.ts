import * as TaskEither from "fp-ts/lib/TaskEither";

import { pipe } from "fp-ts/lib/function";
import {
  addDepsPkjson,
  buildFromTemplateFile,
  writePkgJsonFile,
  yarnInstall,
} from "../helpers";
import {
  ISetupDevEnv,
  PkgCfgDeps,
  SetupEslint,
  SetupProjectPackage,
  SetupTypescript,
  UpdateDeps,
  UpdateEslint,
} from "core/setup-env/base";
import { absordTE } from "yl-ddd-ts";
import { executeSetupEslint } from "core/setup-env/setup-eslint";
import {
  UpdateTsConfigFile,
  ExcuteSetupTypescript,
} from "core/setup-env/setup-typescript";
import { getPackageJsonGeneral } from "core/setup-env/setup-deps-and-scripts";
import path from "path";

const updateDepsWith =
  (projectPath: string, onStdOut: (chunk: any) => void): UpdateDeps =>
  (deps: PkgCfgDeps) =>
    pipe(
      deps,
      addDepsPkjson(projectPath),
      TaskEither.chain(() => yarnInstall(projectPath, onStdOut)),
      absordTE,
    );

const setupEslint: SetupEslint = ({ setupEnvWork, onStdOut }) => {
  const updateEslint: UpdateEslint = (params) => {
    return buildFromTemplateFile(
      setupEnvWork.projectPath,
      path.resolve(
        __dirname,
        IS_TEST
          ? "../resource/eslint-config-template.hbs"
          : "../../../../impl/resource/eslint-config-template.hbs",
      ),
      "./eslintrc.js",
      {
        parser: params.parser,
        buildFolder: params.buildFolder,
        testFolder: params.testFolder,
        parserOpts: params.parseOpts,
      },
    );
  };
  const updateDeps = updateDepsWith(setupEnvWork.projectPath, onStdOut);
  return executeSetupEslint({
    updateEslint,
    updateDeps,
  })(setupEnvWork);
};

const IS_TEST = process.env.IS_TEST;

const setupTypescript: SetupTypescript = ({ setupEnvWork, onStdOut }) => {
  const updateTsConfigFile: UpdateTsConfigFile = (params) => {
    return buildFromTemplateFile(
      setupEnvWork.projectPath,
      path.resolve(
        __dirname,
        IS_TEST
          ? "../resource/tsconfig.hbs"
          : "../../../../impl/resource/tsconfig.hbs",
      ),
      "./tsconfig.json",
      {
        buildDir: setupEnvWork.buildDir,
        hasDeclarationMap: !!params.declarationMapping,
        isSubModule: params.isSubModule,
        testDir: setupEnvWork.testDir,
        includePaths: params.includePaths,
      },
    );
  };
  const updateDeps = updateDepsWith(setupEnvWork.projectPath, onStdOut);
  return pipe(
    setupEnvWork,
    ExcuteSetupTypescript({ updateTsConfigFile, updateDeps }),
  );
};

const setupProjectPackages: SetupProjectPackage = ({
  setupEnvWork,
  onStdOut,
}) => {
  return pipe(
    setupEnvWork.projectSpecificType,
    getPackageJsonGeneral,
    writePkgJsonFile(setupEnvWork.projectPath),
    TaskEither.chain(() => yarnInstall(setupEnvWork.projectPath, onStdOut)),
    TaskEither.chain(() =>
      buildFromTemplateFile(
        setupEnvWork.projectPath,
        path.resolve(
          __dirname,
          IS_TEST
            ? "../resource/jest.config.js.hbs"
            : "../../../../impl/resource/jest.config.js.hbs",
        ),
        "./jest.config.js",
        {},
      ),
    ),
  );
};

/**
 * Implementation detail using Execa for ISetupDevEnv
 */
export const SetupDevEnvWithExeca: ISetupDevEnv = {
  setupEslint: setupEslint,
  setupTypescript: setupTypescript,
  setupProjectModule: setupProjectPackages,
};
