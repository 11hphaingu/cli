#!/usr/bin/env node

import { ProgressSpinnerTrait } from "core/ports/progress-cli-port.spinner";
import { SetupDevEnvWithExeca } from "core/setup-fe-dev-env.execa";
import { commanderInstance } from "ports/commander";
import { Either, pipe } from "yl-ddd-ts";

export * from "./core/index";

const commanderExe = commanderInstance({
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
