import { TaskEither } from "fp-ts/lib/TaskEither";

interface SetupEslint {
  (params: {
    projectPath: string;
    buildFolder: string;
    testFolder: string;
    tsconfigPath: string;
    hasTypescript: boolean;
    // TODO: onStdOut should return IO because it has sideeffect
    onStdOut: (chunk: any) => void;
  }): TaskEither<Error, void>;
}

export enum ProjectTypes {
  node = "node",
  browser = "browser",
}

export enum ProjectSpecificTypes {
  cli = "cli",
  module = "module",
  service = "service",
  web = "web",
}

interface SetupTypescript {
  (params: {
    projectPath: string;
    buildDir: string;
    testDir: string;
    hasDeclarationMap: boolean;
    isSubmodule: boolean;
    includePaths: string[];
    projectType: ProjectTypes;
    // TODO: onStdOut should return IO because it has sideeffect
    onStdOut: (chunk: any) => void;
  }): TaskEither<Error, void>;
}

export type SetupProjectModule = (
  projectType: ProjectSpecificTypes,
  projectPath: string,
) => TaskEither<Error, any>;

export interface ISetupDevEnv {
  setupEslint: SetupEslint;
  setupTypescript: SetupTypescript;
  setupProjectModule: SetupProjectModule;
}
