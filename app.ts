#!/usr/bin/env node

import { Either, pipe } from "yl-ddd-ts";

import * as setupEnv from "./core/setup-env";
import { harvester } from "core/substack";
import * as port from "./ports";
export { port, setupEnv, harvester };

const commanderExe = port.commander.commanderInstance();

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
