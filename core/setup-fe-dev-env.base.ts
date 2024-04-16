import { TaskEither } from "fp-ts/lib/TaskEither";

interface SetupEslint {
  (params: {
    projectPath: string;
    buildFolder: string;
    testFolder: string;
    tsconfigPath: string;
    // TODO: onStdOut should return IO because it has sideeffect
    onStdOut: (chunk: any) => void;
  }): TaskEither<Error, void>;
}

export enum ProjectTypes {
  node = "node",
  browser = "browser",
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

export interface ISetupDevEnv {
  setupEslint: SetupEslint;
  setupTypescript: SetupTypescript;
}
