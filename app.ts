#!/usr/bin/env node

import { ProgressSpinnerTrait } from "core/ports/progress-cli-port.spinner";
import { SetupDevEnvWithExeca } from "impl";
import { Either, pipe } from "yl-ddd-ts";

export * from "./core";
import * as port from "./ports";
export { port };

const commanderExe = port.commander.commanderInstance({
  progressTrait: ProgressSpinnerTrait,
  setupDevEnv: SetupDevEnvWithExeca,
});

commanderExe()
  .then((result) => {
    pipe(
      result,
      Either.match(
        (e) => console.error(`Error occured in commander ${e}`),
        () => console.info("Successful !!!"),
      ),
    );
  })
  .catch((error) => console.error(`Error occurred !!! ${error}`));
