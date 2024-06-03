import { Command } from "commander";
import { PageNumTrait } from "core/substack/harvester.base";
import { main } from "impl/havester/pupeteer.havester-main";
import { Either } from "yl-ddd-ts";

export const initCommanderHavester = (program: Command) =>
  Either.tryCatch(
    () => {
      program
        .command("harvest-substack")
        .argument("<publisher_url>", "publisher url")
        .argument("<publisher_id", "publisher id")
        .option(
          "-max, --max_page [number]",
          "max page",
          parseInt,
          PageNumTrait.MAX_PAGE,
        )
        .option("-limit, --limit_page [number]", "page size", parseInt, 10)
        .description("harvesting substack publisher articles")
        .action((publisher_url, publisher_id, opts) => {
          main(publisher_url, publisher_id, opts.limit_page, opts.max_page);
        });
    },
    (e) => e,
  );
