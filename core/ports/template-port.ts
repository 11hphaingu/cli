import { Reader } from "fp-ts/lib/Reader";
import * as Either from "fp-ts/lib/Either";
import Handlebars from "handlebars";
import { UnknownRecord } from "type-fest";

// base interface
// TODO: separate it to an abstract module, do not put it and its implements in the same module
interface TemplatePort {
  readonly compile: <T = UnknownRecord>(
    template: string,
  ) => (params: T) => Either.Either<Error, string>;
}

// TODO: Employing the Reader approach as a blueprint for implementing caching parameters in forthcoming iterations.
export const getHBStemplatePort: Reader<unknown, TemplatePort> = () => {
  Handlebars.registerHelper("toJSON", (obj) => JSON.stringify(obj, null, 3));
  return {
    compile: (templateContent: string) => (params) =>
      Either.tryCatch(
        () => {
          const template = Handlebars.compile(templateContent);
          return template(params);
        },
        (e) => e as Error,
      ),
  };
};

export const HBSTemplatePort = getHBStemplatePort(null);
