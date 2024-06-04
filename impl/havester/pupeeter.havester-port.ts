import { PgPort } from "core/ports/pg-port";
import {
  CheckIfCatchedAlready,
  DownloadAudio,
  Login,
  MarkAsProcessed,
  Post,
  RetrievePage,
  SubstackHarvestor,
  WritePdf,
} from "core/substack/harvester.base";
import sanitize from "sanitize-filename";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Option, Reader, TE, absordTE, pipe, flow, Either } from "yl-ddd-ts";
import puppeteer, { Browser, Page } from "puppeteer";
import { Progress, ProgressTrait } from "core/ports/progress-cli-port";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const CheckIfCatchedAlreadyPG: Reader.Reader<
  { pgPort: PgPort },
  CheckIfCatchedAlready
> =
  ({ pgPort }) =>
  (id: string) => {
    return pipe(
      pgPort.query(
        "select article.id from substack_articles as article where article.id = $1",
        [id],
      ),
      TE.map(({ rows }) => {
        return rows.length === 0 ? false : true;
      }),
    );
  };

export const MarkAsProcessedPG: Reader.Reader<
  { pgPort: PgPort },
  MarkAsProcessed
> =
  ({ pgPort }) =>
  (id: string, title: string) => {
    return pipe(
      pgPort.query(
        "insert into substack_articles (id, title) values ($1, $2)",
        [id, title],
      ),
      absordTE,
    );
  };

export const DownloadAudioPG: Reader.Reader<
  { pgPort: PgPort },
  DownloadAudio
> =
  ({ pgPort }) =>
  (id: string) =>
  (audio: string) => {
    return pipe(
      pgPort.query(
        "insert into substack_audios (article_id, url) values ($1, $2)",
        [id, audio],
      ),
      absordTE,
    );
  };

export const retrievePageFetch: RetrievePage =
  (harvester: SubstackHarvestor) =>
  ({ page, limit }) =>
    TE.tryCatch(
      async () => {
        const rawPosts = (await (
          await fetch(
            `https://${harvester.publisherUrl}/api/v1/archive?offset=${page * limit}&limit=${limit}`,
          )
        ).json()) as any[];
        return rawPosts.map<Post>((rawP) => ({
          id: rawP["id"],
          canonicalUrl: rawP["canonical_url"],
          title: rawP["title"],
          audio: ((rawP["audio_items"] as any[]) || [])
            .map((rawAudio: any) => rawAudio["audio_url"] as string)
            .filter((url) => !!url),
        }));
      },
      (e) => e as Error,
    );

export const LoginWithPupeeter: Reader.Reader<
  {
    browser: Browser;
    progress: Progress;
    progressTrait: ProgressTrait<any>;
  },
  Login
> =
  ({ browser, progress, progressTrait }) =>
  (havestor: SubstackHarvestor) =>
    absordTE(
      TE.tryCatch(
        async () => {
          progressTrait.updateProgress({
            currentJob: Option.some(`login pub: in progress`),
            currentStep: Option.some(1),
            color: Option.some("red"),
          })(progress)();
          const page = await browser.newPage();
          // Navigate to ByteByteGo blog
          await page.goto(`https://${havestor.publisherUrl}`);
          // Check if already logged in by looking for a specific element or URL
          const COOKIES_PATH = path.resolve(process.cwd(), "cookies.json");
          const isLoggedIn = fs.existsSync(COOKIES_PATH);
          if (isLoggedIn) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf-8"));
            await page.setCookie(...cookies);
          } else {
            const interactiveBrowser = await puppeteer.launch({
              headless: false,
            });
            const interactivePage = await interactiveBrowser.newPage();
            await interactivePage.goto(
              `https://substack.com/sign-in?redirect=%2F&for_pub=${havestor.pubId}`,
              { waitUntil: "networkidle2" },
            );
            await interactivePage.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: 0,
            }); // Get cookies after successful login
            const cookies = await interactivePage.cookies();

            // Optionally, close the interactive browser
            await interactiveBrowser.close();
            fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
            await page.setCookie(...cookies);

            progressTrait.updateProgress({
              currentJob: Option.some(`login pub: in progress`),
            })(progress);
            await page.close();
          }
          progressTrait.updateProgress({
            currentJob: Option.some(`login pub: finished`),
          })(progress)();
        },
        (e) => e,
      ),
    );
export const WritePdfWithPuppeteer: Reader.Reader<
  {
    page: Page;
    progress: Progress;
    chunkToJob: (chunk: string) => string;
    progressTrait: ProgressTrait<any>;
  },
  WritePdf
> =
  ({ page, progress, progressTrait, chunkToJob }) =>
  (havester: SubstackHarvestor) =>
  (post: Post) =>
    pipe(
      // check folder exist if not create one
      path.resolve(process.cwd(), "data", havester.pubId),
      TE.fromPredicate(fs.existsSync, (p) => p),
      TE.orElse(
        flow(
          (p) =>
            Either.tryCatch(
              () => {
                fs.mkdirSync(p, { recursive: true });
                return p;
              },
              (e) => e,
            ),
          TE.fromEither,
        ),
      ),
      TE.chain((storePath) =>
        TE.tryCatch(
          async () => {
            progressTrait.updateProgress({
              currentJob: Option.some(
                chunkToJob(`download ${post.title} start`),
              ),
              currentStep: Option.some(2),
              color: Option.some("red"),
            })(progress)();
            await page.goto(post.canonicalUrl, { waitUntil: "networkidle2" });
            await page.waitForSelector("h1.post-title");
            await page.pdf({
              path: `${storePath}/${sanitize(post.title)}.pdf`, // Output file path
              format: "A4", // Paper format
              printBackground: true, // Include background graphics
              margin: {
                top: "20mm",
                right: "20mm",
                bottom: "20mm",
                left: "20mm",
              },
            });
            progressTrait.updateProgress({
              currentJob: Option.some(
                chunkToJob(`download ${post.title} finished`),
              ),
            })(progress)();
          },
          (e) => e,
        ),
      ),
      absordTE,
    );
