import { Option, TE } from "yl-ddd-ts";
import { executeSetupEslint } from "./setup-eslint";

/**
 * Module representing the setup for a development environment.
 * @module setup-development-environment
 */

/**
 * Enum representing different types of projects.
 * according to the environment that run the js
 * code
 */
export enum ProjectTypes {
  node = "node",
  browser = "browser",
}
/**
 * Enum representing specific project types.
 * that divided by considering the dimension
 * of the application type that our project
 * dedicate to
 */
export enum ProjectSpecificTypes {
  cli = "cli",
  module = "module",
  service = "service",
  web = "web",
}

export const getProjectSpecificType = (type: string): ProjectSpecificTypes => {
  if (type in ProjectSpecificTypes) {
    return type as ProjectSpecificTypes;
  }
  throw new Error("INCORRECT_PROJECT_SPECIFIC_TYPE");
};

/*
 * Model representing the portion of deps delaration in package.json configuration.
 * This includes:
 *  * Development tools
 *  * Production tools
 */
export type PkgCfgDeps = {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
};

/*
 * Model representing the package.json configuration.
 * This includes:
 *  * Development tools
 *  * Production tools
 *  * Utility scripts
 *  * Standard configurations for bin and main location,
 *    depending on the type of project (CLI, module, React).
 * @model
 */

export type PkgCfg = PkgCfgDeps & {
  script: Record<string, string>;
  main: string;
  bin?: string;
  exports?: Record<string, string>;
};

/**
 * Sets up ESLint configuration for a given project.
 *
 * @param params - The parameters for setting up ESLint.
 * @param params.setupEnvWork - the SetupEnvWork instance
 * @param params.onStdOut - Callback function for handling stdout chunks.
 * you can pass a function such as a reporter for the purpose of progress report
 * for example
 * @returns A TaskEither containing an Error or void.
 */
export type SetupEslint = (params: {
  setupEnvWork: SetupEnvWork;
  // TODO: onStdOut should return IO because it has sideeffect
  onStdOut: (chunk: any) => void;
}) => TE.TaskEither<Error, void>;

/**
 * Sets up TypeScript configuration for a given project.
 *
 * @param params - The parameters for setting up TypeScript.
 * @param params.setupEnvWork - the SetupEnvWork instance
 * @param params.onStdOut - Callback function for handling stdout chunks.
 * @returns A TaskEither containing an Error or void.
 */
export type SetupTypescript = (params: {
  setupEnvWork: SetupEnvWork;
  // TODO: onStdOut should return IO because it has sideeffect
  onStdOut: (chunk: any) => void;
}) => TE.TaskEither<Error, void>;

/**
 * Initiate the module deps for our project, constitute a numerous
 * package that benefitial for our developemt as per the project type
 *
 * @param projectType {ProjectSpecificTypes} - The specific type of project.
 * @param projectPath - The path to the project.
 * @returns A TaskEither containing an Error or any.
 */
export type SetupProjectPackage = (params: {
  setupEnvWork: SetupEnvWork;
  onStdOut: (chunk: any) => void;
}) => TE.TaskEither<Error, any>;

export type TsConfig = {
  declarationMapping: boolean;
  includePaths: string[];
  tsconfigPath: string;
};

export type EslintCfg = {
  parser: string;
  buildFolder: string;
  testFolder: string;
  parseOpts: any;
};

export interface SetupEnvWork {
  projectPath: string;
  buildDir: string;
  testDir: string;
  isSubmodule: boolean;
  projectType: ProjectTypes;
  projectSpecificType: ProjectSpecificTypes;
  tsConfig: Option.Option<TsConfig>;
}

export const isHasTs = (setupEnvWork: SetupEnvWork) =>
  Option.isSome(setupEnvWork.tsConfig);

/**
 * A port that has side-effect of update the eslint config
 * @param eslintCfg  {EslintCfg} - instance of eslint config domain model.
 * @returns A TaskEither containing the result of updating eslint config.
 */
export type UpdateEslint = (params: EslintCfg) => TE.TaskEither<Error, void>;

/**
 * A port that has side-effect of update the eslint config
 * @param eslintCfg  {EslintCfg} - instance of eslint config domain model.
 * @returns A TaskEither containing the result of updating eslint config.
 */
export type UpdateDeps = (params: PkgCfgDeps) => TE.TaskEither<Error, void>;

export interface ISetupDevEnv {
  setupEslint: SetupEslint;
  setupTypescript: SetupTypescript;
  setupProjectModule: SetupProjectPackage;
}

export const SetupDevTaskTrait = {
  executeSetupEslint: executeSetupEslint,
};
