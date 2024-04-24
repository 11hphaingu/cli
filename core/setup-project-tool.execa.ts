// For cli

import { TE, pipe } from "yl-ddd-ts";
import { addDepsPkjson, addScripts, writePkgJsonFile } from "./helpers";
import { mergeDeepRight } from "ramda";
import { PackageJson } from "type-fest";
import {
  ProjectSpecificTypes,
  SetupProjectModule,
} from "./setup-fe-dev-env.base";
import { P, match } from "ts-pattern";

const addCommonDeps =
  (projectType: ProjectSpecificTypes) => (pkgJson: PackageJson) => {
    const deps = {
      "ts-pattern": "^5.1.1",
      "yl-ddd-ts": "^2.0.1",
      ramda: "^0.28.0",
    };
    const specificDeps = match(projectType)
      .with(
        P.union(ProjectSpecificTypes.cli, ProjectSpecificTypes.service),
        () => ({}),
      )
      .otherwise(() => ({}));
    return mergeDeepRight(pkgJson, {
      dependencies: { ...deps, ...specificDeps },
    });
  };
// TODO: finish setup project for cli
export const setupProjectForCli = (projectPath: string) => {
  const deps = {
    commander: "^12.0.0",
    execa: "^5.1.1",
    figlet: "^1.7.0",
    ora: "^5.4.1",
    glob: "^7.1.6",
    handlebars: "^4.7.8",
  };
  // because of the decision of upgrading from commonjs to esm
  // the version range from {execa|ora} version -> their newest one
  // are not compatible with the module system (commonjs) of our
  // cli building artifact.
  //
  // So please figure the way to uprading the build system to support
  // esm or keep the version of execa to 5.x.x and ora to 5.x too
  //
  //
  const devDeps = {
    "@types/figlet": "^1",
    "@types/fs-extra": "^5.0.5",
    "@types/glob": "^7.1.3",
  };
  const scripts = {
    build:
      "rimraf dist && tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
    run: "node dist/index.js",
    "test-run":
      "ts-node --project tsconfig.json -r tsconfig-paths/register index.ts",
  };
  const cjsBuildFolder = "dist/cjs";
  const asPerBuildFolder = (buildFolder: string) => (pkg: PackageJson) =>
    mergeDeepRight(pkg, {
      main: `${buildFolder}/index.js`,
      bin: `${buildFolder}/index.js`,
    });
  return pipe(
    {
      deps,
      devDeps,
    },
    addDepsPkjson(projectPath),
    TE.map((pkg) => addScripts(pkg)(scripts)),
    TE.map(addCommonDeps(ProjectSpecificTypes.cli)),
    TE.map(asPerBuildFolder(cjsBuildFolder)),
    TE.chain(writePkgJsonFile(projectPath)),
  );
};

export const setupProjectForNodeModule = (projectPath: string) => {
  const deps = {};
  const devDeps = {};
  const scripts = {
    build:
      "rimraf dist && tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
    "trace-resolution": "tsc --traceResolution",
    lint: "eslint . --ext .ts",
    "lint-fix": "eslint . --ext .ts --fix",
    test: "jest",
    "npm-publish": "yarn test && yarn lint && yarn build && yarn publish",
    preversion: "npm run lint",
    version: "git add -A src",
    postversion: "git push && git push --tags",
  };
  const buildFolder = "dist";
  const asPerBuildFolder = (buildFolder: string) => (pkg: PackageJson) =>
    mergeDeepRight(pkg, {
      main: `${buildFolder}/index.js`,
      exports: {
        ".": `${buildFolder}/index.js`,
      },
    }) as PackageJson;

  return pipe(
    {
      deps,
      devDeps,
    },
    addDepsPkjson(projectPath),
    TE.map((pkg) => addScripts(pkg)(scripts)),
    TE.map(addCommonDeps(ProjectSpecificTypes.cli)),
    TE.map(asPerBuildFolder(buildFolder)),
    TE.chain(writePkgJsonFile(projectPath)),
  );
};

export const setupModule: SetupProjectModule = (projectType, projectPath) => {
  return (
    match(projectType)
      .with(ProjectSpecificTypes.cli, () => setupProjectForCli(projectPath))
      .with(ProjectSpecificTypes.module, () =>
        setupProjectForNodeModule(projectPath),
      )
      // with service and browser type,
      // almost the case, we dont have obligation to init
      // dev environment by myself, but fully supported by framework
      // for example: browser with nextjs, or rca, service we use expressjs cli, or nestjs cli
      .otherwise(() => TE.right(null))
  );
};
