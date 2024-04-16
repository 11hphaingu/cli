/**
 * @since 0.6.0
 */
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as fs from "fs-extra";
import * as glob from "glob";

import rimraf from "rimraf";

/**
 * Represents operations that can be performed on a file system.
 *
 * @category model
 */
export interface FileSystem {
  readonly readFile: (path: string) => TE.TaskEither<Error, string>;

  readonly closeFile: (fileDescriptor: number) => TE.TaskEither<Error, void>;
  /**
   * If the parent directory does not exist, it's created.
   */
  readonly writeFile: (
    path: string,
  ) => (content: string) => TE.TaskEither<Error, void>;
  readonly exists: (path: string) => TE.TaskEither<Error, boolean>;
  /**
   * Removes a file or directory based upon the specified pattern. The directory can have contents.
   * If the path does not exist, silently does nothing.
   */
  readonly remove: (pattern: string) => TE.TaskEither<Error, void>;
  /**
   * Searches for files matching the specified glob pattern.
   */
  readonly search: (
    pattern: string,
    exclude: ReadonlyArray<string>,
  ) => TE.TaskEither<Error, ReadonlyArray<string>>;
}

/**
 * Represents a file which can be optionally overwriteable.
 *
 * @category model
 */
export interface File {
  readonly path: string;
  readonly content: string;
  readonly overwrite: boolean;
}

/**
 * By default files are readonly (`overwrite = false`).
 *
 * @category constructors
 */
export const File = (
  path: string,
  content: string,
  overwrite = false,
): File => ({
  path,
  content,
  overwrite,
});

const readFile: (
  path: string,
  encoding: string,
) => TE.TaskEither<Error, string> = TE.taskify<string, string, Error, string>(
  fs.readFile,
);

const closeFile: (fileDescriptor: number) => TE.TaskEither<Error, void> =
  TE.taskify(fs.close);

const writeFile: (
  path: string,
  data: string,
  options: {
    readonly encoding?: string;
    readonly flag?: string;
    readonly mode?: number;
  },
) => TE.TaskEither<Error, void> = TE.taskify<
  string,
  string,
  fs.WriteFileOptions,
  Error,
  void
>(fs.outputFile);

const exists: (path: string) => TE.TaskEither<Error, boolean> = TE.taskify<
  string,
  Error,
  boolean
>(fs.pathExists);

const remove: (
  path: string,
  options: rimraf.Options,
) => TE.TaskEither<Error, void> = TE.taskify<
  string,
  rimraf.Options,
  Error,
  void
>(rimraf);

const search: (
  pattern: string,
  options: glob.IOptions,
) => TE.TaskEither<Error, ReadonlyArray<string>> = TE.taskify<
  string,
  glob.IOptions,
  Error,
  ReadonlyArray<string>
>(glob.glob);

/**
 * @category instances
 */
export const FileSystem: FileSystem = {
  readFile: (path) => pipe(readFile(path, "utf8")),
  writeFile: (path) => (content) =>
    pipe(writeFile(path, content, { encoding: "utf8" })),
  closeFile: (fileD: number) => closeFile(fileD),
  exists,
  remove: (pattern) => pipe(remove(pattern, {})),
  search: (pattern, exclude) => pipe(search(pattern, { ignore: exclude })),
};
