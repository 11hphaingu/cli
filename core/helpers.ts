import { flow, pipe, flip } from "fp-ts/lib/function";
import path from "path";
import { FileSystem } from "./ports/filestystem-port";
import * as TaskEither from "fp-ts/lib/TaskEither";
import { JsonUtil } from "./ports/json";
import { PackageJson, UnknownRecord } from "type-fest";
import { mergeDeepRight } from "ramda";
import * as Option from "fp-ts/lib/Option";
import { ExecaPort } from "./ports/execa-port";
import { HBSTemplatePort } from "./ports/template-port";
import { ExecaChildProcess } from "execa";

interface AddDepsPkjson {
  (
    projectPath: string,
  ): (params: {
    deps: PackageJson["dependencies"];
    devDeps: PackageJson["devDependencies"];
  }) => TaskEither.TaskEither<Error, void>;
}

interface YarnInstall {
  (
    projectPath: string,
    onOuputStream: (chunk: any) => void,
  ): TaskEither.TaskEither<Error, ExecaChildProcess<string>>;
}

type BuildFileFromTpl = <T = UnknownRecord>(
  projectPath: string,
  dirNameRltTemplatePath: string,
  outDir: string,
  params: T,
) => TaskEither.TaskEither<Error, void>;

type ReadPkgJsonFile = (
  jsonPath: string,
) => TaskEither.TaskEither<Error, PackageJson>;

export const readPkgJsonFile: ReadPkgJsonFile = (jsonPath: string) =>
  pipe(
    jsonPath,
    FileSystem.readFile,
    TaskEither.chain(flow(JsonUtil.parse<PackageJson>, TaskEither.fromEither)),
  );

export const addDepsPkjson: AddDepsPkjson =
  (projectPath: string) => (params) => {
    const { deps, devDeps } = params;
    const pkjsonPath = path.join(projectPath, "/package.json");
    return pipe(
      pkjsonPath,
      readPkgJsonFile,
      TaskEither.map(
        mergeDeepRight({
          dependencies: deps,
          devDependencies: devDeps,
        }),
      ),
      // TaskEither.tapIO((pkgData) => () => console.log("pkgData", pkgData)),
      TaskEither.map(JSON.stringify),
      TaskEither.chain(FileSystem.writeFile(pkjsonPath)),
    );
  };

export const yarnInstall: YarnInstall = (
  projectPath: string,
  onOuputStream: (chunk: any) => void,
) =>
  ExecaPort.exec({
    file: "yarn",
    option: Option.some({
      cwd: projectPath,
    }),
    args: Option.some(["install"]),
    onStdout: onOuputStream,
  });

export const buildFromTemplateFile: BuildFileFromTpl = <T = UnknownRecord>(
  projectPath: string,
  dirNameRltTemplatePath: string,
  prjRltOutDirPath: string,
  params: T,
) => {
  const TEMPLATE_PATH = path.join(__dirname, dirNameRltTemplatePath);
  return pipe(
    TEMPLATE_PATH,
    FileSystem.readFile,
    TaskEither.chainW(
      flow(flip(HBSTemplatePort.compile)(params), TaskEither.fromEither),
    ),
    TaskEither.chain(
      pipe(path.join(projectPath, prjRltOutDirPath), FileSystem.writeFile),
    ),
  );
};
