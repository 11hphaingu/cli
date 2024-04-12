import { TaskEither } from "fp-ts/lib/TaskEither";
import * as Option from "fp-ts/lib/Option";

interface SetupEslint {
  (params: {
    projectPath: string;
    buildFolder: Option.Option<string>;
    testFolder: Option.Option<string>;
    tsconfigPath: Option.Option<string>;
  }): TaskEither<Error, void>;
}

interface SetupTypescript {
  (params: {
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
