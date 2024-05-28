import { pipe } from "yl-ddd-ts";
import { PkgCfg, ProjectSpecificTypes } from "./base";
import { mergeRight } from "ramda";
import { match } from "ts-pattern";

/*
 * Smart constructor to generate the PkgCfg instance
 * based on the projectType
 * @param projectType - The specific type of the project (e.g., CLI, module).
 * @returns {PkgCfg} A `PkgCfg` object containing the merged package.json configuration.
 **/

export const getPackageJsonGeneral = (
  projectType: ProjectSpecificTypes,
): PkgCfg => {
  const cjsBuildFolder = "dist/cjs";
  return pipe(
    {
      deps: {
        "ts-pattern": "^5.1.1",
        "yl-ddd-ts": "^2.0.1",
        ramda: "^0.28.0",
      },
      devDeps: {
        "ts-jest": "^29.0.5",
        jest: "^29.4.3",
      },
      main: `${cjsBuildFolder}/index.js`,
      script: {
        test: "jest --config jest.config.js",
      },
    } as PkgCfg,
    mergeRight(
      match(projectType)
        .with(ProjectSpecificTypes.cli, () => ({
          deps: {
            commander: "^12.0.0",
            execa: "^5.1.1",
            figlet: "^1.7.0",
            ora: "^5.4.1",
            glob: "^7.1.6",
            handlebars: "^4.7.8",
          },
          devDeps: {
            "@types/figlet": "^1",
            "@types/fs-extra": "^5.0.5",
            "@types/glob": "^7.1.3",
          },
          main: `${cjsBuildFolder}/index.js`,
          bin: `${cjsBuildFolder}/index.js`,
          scripts: {
            build:
              "rimraf dist && tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
            run: "node dist/index.js",
            "test-run":
              "ts-node --project tsconfig.json -r tsconfig-paths/register index.ts",
          },
        }))
        .with(ProjectSpecificTypes.module, () => ({
          scripts: {
            build:
              "rimraf dist && tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
            "trace-resolution": "tsc --traceResolution",
            lint: "eslint . --ext .ts",
            "lint-fix": "eslint . --ext .ts --fix",
            test: "jest",
            "npm-publish":
              "yarn test && yarn lint && yarn build && yarn publish",
            preversion: "npm run lint",
            version: "git add -A src",
            postversion: "git push && git push --tags",
          },
          main: `${cjsBuildFolder}/index.js`,
          exports: {
            ".": `${cjsBuildFolder}/index.js`,
          },
        }))
        .otherwise(() => ({})),
    ),
  );
};
