/**
 * Module representing the setup for a development environment.
 * @module setup-development-environment
 */
export {
  ProjectSpecificTypes,
  UpdateDeps,
  UpdateEslint,
  PkgCfg,
  SetupEslint,
} from "./base";
export { getPackageJsonGeneral } from "./setup-deps-and-scripts";
export { executeSetupEslint } from "./setup-eslint";
export { ExcuteSetupTypescript, UpdateTsConfigFile } from "./setup-typescript";
