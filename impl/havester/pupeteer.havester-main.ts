import { ProgressSpinnerTrait } from "core/ports/progress-cli-port.spinner";
import puppeteer from "puppeteer";
import {
  CheckIfCatchedAlreadyPG,
  DownloadAudioPG,
  LoginWithPupeeter,
  MarkAsProcessedPG,
  WritePdfWithPuppeteer,
  retrievePageFetch,
} from "./pupeeter.havester-port";
import { Harvest, PageNum } from "core/substack/harvester.base";
import { Either, pipe } from "yl-ddd-ts";
import { getPgPort } from "core/ports/pg-port";

export const main = async (
  publisherUrl: string,
  pubId: string,
  limit: number,
  maxPage: PageNum,
) => {
  const pgPortInit = await getPgPort({
    pgconfig: {
      host: process.env.PG_HOST || "localhost",
      port: parseInt(process.env.PG_PORT || "5433"),
      username: process.env.PG_USR || "admin",
      pwd: process.env.PG_PWD || "password",
      db: process.env.PG_DB || "postgres",
    },
  })();

  const pgPort = pipe(
    pgPortInit,
    Either.match(
      (err) => {
        throw err;
      },
      (result) => result,
    ),
  );
  const browser = await puppeteer.launch({ headless: false });
  const progress = ProgressSpinnerTrait.construct(1, "login in publisher", 3);
  const login = LoginWithPupeeter({
    browser,
    progress,
    progressTrait: ProgressSpinnerTrait,
  });
  const page = await browser.newPage();
  const writePdf = WritePdfWithPuppeteer({
    page,
    progress,
    progressTrait: ProgressSpinnerTrait,
    chunkToJob: (chunk) => `Download PDF: ${chunk}`,
  });

  ProgressSpinnerTrait.start(progress)();

  const puppeteerHarvest = Harvest({
    checkIfCatchedAlready: CheckIfCatchedAlreadyPG({ pgPort }),
    login,
    retrievePage: retrievePageFetch,
    writePdf,
    markAsProcessed: MarkAsProcessedPG({ pgPort }),
    downloadAudio: DownloadAudioPG({ pgPort }),
  });

  const result = await puppeteerHarvest(
    {
      publisherUrl,
      pubId,
    },
    limit,
    maxPage,
  )();

  return pipe(
    result,
    Either.match(
      (e) => {
        throw e;
      },
      () => {
        ProgressSpinnerTrait.succeed(progress)();
        console.log("DONE crawling");
      },
    ),
  );
};
