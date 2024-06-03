import { IO } from "fp-ts/lib/IO";
import { Option } from "fp-ts/lib/Option";

export interface Progress {
  currentStep: number;
  currentJob: string;
  numberSteps: number;
}

export interface ProgressTrait<P extends Progress> {
  updateProgress: (
    update: Partial<{
      currentStep: Option<number>;
      currentJob: Option<string>;
      color: Option<string>;
    }>,
  ) => (progress: P) => IO<P>;
  start: (progress: P) => IO<P>;
  succeed: (progress: P) => IO<P>;
  construct: (initStep: number, initJob: string, numberSteps: number) => P;
}
