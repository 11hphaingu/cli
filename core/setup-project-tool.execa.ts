// For cli

import { TE } from "yl-ddd-ts/logic";

// TODO: finish setup project for cli
export const setupProjectForCli = () => {
  const deps = {
    commander: "^12.0.0",
    execa: "^5.1.1",
    figlet: "^1.7.0",
    ora: "^5.4.1",
  };
  // because of the decision of upgrading from commonjs to esm
  // the version range from {execa|ora} version -> their newest one
  // are not compatible with the module system (commonjs) of our
  // cli building artifact.
  //
  // So please figure the way to uprading the build system to support
  // esm or keep the version of execa to 5.x.x and ora to 5.x too
  //
  const scripts = {
    build:
      "rimraf dist && tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
    run: "node dist/index.js",
    "test-run":
      "ts-node --project tsconfig.json -r tsconfig-paths/register index.ts",
  };
  const cjsBuildFolder = "dist/cjs";

  return TE.right(null);
};
