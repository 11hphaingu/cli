import ora, { Color, Ora } from "ora";
import * as IO from "fp-ts/lib/IO";
import { Progress, ProgressTrait } from "./progress-cli-port";
import { Option } from "yl-ddd-ts";
import { pipe } from "fp-ts/function";

export interface ProgressSpinner extends Progress {
  spinner: Ora;
}

const spinnerTextGen = (
  currentStep: number,
  numberOfSteps: number,
  currentWork: string,
) => `${currentStep}/${numberOfSteps} - ${currentWork}`;

export const ProgressSpinnerTrait: ProgressTrait<ProgressSpinner> = {
  construct: (initStep: number, initJob: string, numberOfSteps: number) => ({
    spinner: ora(initJob),
    currentStep: initStep,
    currentJob: initJob,
    numberSteps: numberOfSteps,
  }),
  start: (progress: ProgressSpinner) => {
    return () => {
      // effectful
      const spinnerStarted = progress.spinner.start();
      spinnerStarted.color = "yellow";
      spinnerStarted.text = spinnerTextGen(
        progress.currentStep,
        progress.numberSteps,
        progress.currentJob,
      );
      return {
        ...progress,
        spinner: spinnerStarted,
      };
    };
  },
  succeed: (progress: ProgressSpinner) => {
    return () => {
      const spinnerStarted = progress.spinner.succeed(); // effectfull
      return {
        ...progress,
        currentStep: progress.numberSteps,
        spinner: spinnerStarted,
      };
    };
  },
  updateProgress: (update) => (progress) => {
    // effectful all
    return pipe(
      update.color,
      Option.match(
        () => IO.of(progress),
        (color) => () => {
          progress.spinner.color = color as Color;
          return progress;
        },
      ),
      IO.flatMap((p) =>
        pipe(
          update.currentStep,
          Option.match(
            () => IO.of(p),
            (c) => () => {
              const newProgress: ProgressSpinner = {
                ...p,
                currentStep: c,
              };
              p.spinner.text = spinnerTextGen(
                newProgress.currentStep,
                newProgress.numberSteps,
                newProgress.currentJob,
              );
              return newProgress;
            },
          ),
        ),
      ),
      IO.flatMap((p) =>
        pipe(
          update.currentJob,
          Option.match(
            () => IO.of(p),
            (c) => () => {
              const newProgress: ProgressSpinner = {
                ...p,
                currentJob: c,
              };
              p.spinner.text = spinnerTextGen(
                newProgress.currentStep,
                newProgress.numberSteps,
                c,
              );
              return p;
            },
          ),
        ),
      ),
    );
  },
};
