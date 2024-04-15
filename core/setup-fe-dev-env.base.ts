import { TaskEither } from "fp-ts/lib/TaskEither";

interface SetupEslint {
  (params: {
    projectPath: string;
    buildFolder: string;
    testFolder: string;
    tsconfigPath: string;
  }): TaskEither<Error, void>;
}

interface SetupTypescript {
  (params: {
    projectPath: string;
    buildDir: string;
    testDir: string;
    hasDeclarationMap: boolean;
    isSubmodule: boolean;
    includePaths: string[];
  }): TaskEither<Error, void>;
}

export interface ISetupDevEnv {
  setupEslint: SetupEslint;
  setupTypescript: SetupTypescript;
}
