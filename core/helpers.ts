import { flow, pipe, flip } from "fp-ts/lib/function";
import path from "path";
import { FileSystem } from "./ports/filestystem-port";
import * as TaskEither from "fp-ts/lib/TaskEither";
import { JsonUtil } from "./ports/json";
import { PackageJson, UnknownRecord } from "type-fest";
import { mergeRight } from "ramda";
import * as Option from "fp-ts/lib/Option";
import { ExecaPort } from "./ports/execa-port";
import { absordTE } from "yl-ddd-ts";
import { HBSTemplatePort } from "./ports/template-port";

interface AddDepsPkjson {
  (
    projectPath: string,
  ): (params: {
    deps: PackageJson["dependencies"];
    devDeps: PackageJson["devDependencies"];
  }) => TaskEither.TaskEither<Error, void>;
}

interface YarnInstall {
  (projectPath: string): TaskEither.TaskEither<Error, void>;
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
        mergeRight({
          dependencies: deps,
          devDependencies: devDeps,
        }),
      ),
      TaskEither.map(JSON.stringify),
      TaskEither.chain(FileSystem.writeFile(pkjsonPath)),
    );
  };

export const yarnInstall: YarnInstall = (projectPath: string) =>
  pipe(
    ExecaPort.exec({
      file: "yarn",
      option: Option.some({
        cwd: projectPath,
      }),
      args: Option.some(["install"]),
    }),
    absordTE,
  );

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
