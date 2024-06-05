import { flow, pipe, flip } from "fp-ts/lib/function";
import path from "path";
import * as TaskEither from "fp-ts/lib/TaskEither";
import { PackageJson, UnknownRecord } from "type-fest";
import { mergeDeepRight } from "ramda";
import * as Option from "fp-ts/lib/Option";
import { ExecaChildProcess } from "execa";
import { FileSystem } from "core/ports/filestystem-port";
import { JsonUtil } from "core/ports/json";
import { ExecaPort } from "core/ports/execa-port";
import { HBSTemplatePort } from "core/ports/template-port";

export type AddDepsPkjsonParams = {
  deps: PackageJson["dependencies"];
  devDeps: PackageJson["devDependencies"];
};

interface AddDepsPkjson {
  (
    projectPath: string,
  ): (params: AddDepsPkjsonParams) => TaskEither.TaskEither<Error, PackageJson>;
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
) => TaskEither.TaskEither<Error, any>;

type ReadPkgJsonFile = (
  jsonPath: string,
) => TaskEither.TaskEither<Error, PackageJson>;

type WritePkgJsonFile = (
  jsonPath: string,
) => (content: PackageJson) => TaskEither.TaskEither<Error, void>;

type AddAdditionalScript = (
  pkg: PackageJson,
) => (scripts: PackageJson["scripts"]) => PackageJson;

export const readPkgJsonFile: ReadPkgJsonFile = (
  projectPath: string = process.cwd(),
) =>
  pipe(
    path.join(projectPath, "/package.json"),
    FileSystem.readFile,
    TaskEither.chain(flow(JsonUtil.parse<PackageJson>, TaskEither.fromEither)),
  );

export const writePkgJsonFile: WritePkgJsonFile =
  (projectPath: string) => (content) => {
    const jsonPath = path.join(projectPath, "/package.json");
    return pipe(content, JSON.stringify, FileSystem.writeFile(jsonPath));
  };

export const addDepsPkjson: AddDepsPkjson =
  (projectPath: string) => (params) => {
    const { deps, devDeps } = params;
    return pipe(
      projectPath,
      readPkgJsonFile,
      TaskEither.map(
        (pkg) =>
          mergeDeepRight(
            {
              dependencies: deps,
              devDependencies: devDeps,
            },
            pkg,
          ) as PackageJson,
      ),
      // TaskEither.tapIO((pkgData) => () => console.log("pkgData", pkgData)),
      TaskEither.tap(writePkgJsonFile(projectPath)),
    );
  };

export const addScripts: AddAdditionalScript =
  (pkg: PackageJson) => (scripts: PackageJson["scripts"]) =>
    pipe(pkg, (pkg) => mergeDeepRight({ scripts }, pkg) as PackageJson);

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
  templatePath: string,
  prjRltOutDirPath: string = process.cwd(),
  params: T,
) => {
  return pipe(
    templatePath,
    FileSystem.readFile,
    TaskEither.chainW(
      flow(flip(HBSTemplatePort.compile)(params), TaskEither.fromEither),
    ),
    TaskEither.chain(
      pipe(path.join(projectPath, prjRltOutDirPath), FileSystem.writeFile),
    ),
  );
};
