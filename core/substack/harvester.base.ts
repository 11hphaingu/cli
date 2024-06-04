import { LoopableTrait } from "core/fp/recur-return";
import { Reader } from "fp-ts/lib/Reader";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { TE, pipe } from "yl-ddd-ts";
/**
 * Asynchronously checks if an article with a given ID has already been processed.
 *
 * @param id - The unique identifier of the article to check.
 * @returns A `TaskEither` that resolves to `true` if the article has been processed, `false` if not, or an `Error` if there was a problem during the check.
 */
export type CheckIfCatchedAlready = (id: string) => TaskEither<Error, boolean>;

/**
 * Logs into the Substack platform to enable content retrieval.
 *
 * @param {SubstackHarvestor} havestor - The `SubstackHarvestor` object containing details about the publication to access.
 * @returns A `TaskEither` that resolves successfully (`void`) upon successful login or returns an `Error` if there was a login issue.
 */
export type Login = (havestor: SubstackHarvestor) => TaskEither<Error, void>;

/**
 * Domain model represents a Substack article.
 *
 * @param id - The unique identifier of the post.
 * @param canonicalUrl - The canonical URL of the post.
 * @param title - The title of the post.
 * @param audio - An array of URLs for audio files associated with the post.
 */
export type Post = {
  id: string;
  canonicalUrl: string;
  title: string;
  audio: string[];
};
/**
 * Marks an article as processed.
 *
 * @param id - The unique identifier of the article.
 * @param title - The title of the article (for potential logging or reporting purposes).
 * @returns A `TaskEither` that resolves successfully (`void`) if the article is marked, or an `Error` if there's an issue during processing.
 */
export type MarkAsProcessed = (
  id: string,
  title: string,
) => TaskEither<Error, void>;
/**
 * Downloads an audio file associated with an article.
 *
 * @param id - The unique identifier of the article.
 * @param audio - The URL of the audio file to download.
 * @returns A `TaskEither` that resolves successfully (`void`) when the download completes, or an `Error` if the download fails.
 */
export type DownloadAudio = (
  id: string,
) => (audio: string) => TaskEither<Error, void>;

/**
 * Represents a Substack publication to harvest from.
 *
 * @param publisherUrl - The base URL of the Substack publisher (e.g., "https://example.substack.com").
 * @param pubId - A unique identifier for the publication within the Substack platform.
 */
export interface SubstackHarvestor {
  publisherUrl: string;
  pubId: string;
}

/**
 * Retrieves a page of articles from a Substack publication.
 *
 * @param {SubstackHarvestor} harvestor - The `SubstackHarvestor` object specifying the publication.
 * @param pagParam - An object containing the `page` number and `limit` (number of articles per page).
 * @returns A `TaskEither` that resolves to an array of `Post` objects representing the retrieved articles, or an `Error` if the retrieval fails.
 */
export type RetrievePage = (
  harvestor: SubstackHarvestor,
) => (pagParam: { page: number; limit: number }) => TaskEither<Error, Post[]>;

/**
 * Writes the content of a Substack article into a PDF file.
 *
 * @param {SubstackHarvestor} harvestor  - The `SubstackHarvestor` object identifying the publication.
 * @param {Post} post - The `Post` object representing the article to be converted to PDF.
 * @returns A `TaskEither` that resolves successfully (`void`) if the PDF is written, or an `Error` if there's an issue during the process.
 */
export type WritePdf = (
  harvestor: SubstackHarvestor,
) => (post: Post) => TaskEither<Error, void>;
export type PageNum = number;
export const PageNumTrait = {
  isInfinity: (page: PageNum) => page === PageNumTrait.MAX_PAGE,
  MAX_PAGE: -1,
};

/**
 * Represents the core harvester factory.
 *
 * This function takes a configuration object as input, which is defined as a `Reader` type from `fp-ts`. This configuration object should adhere to the following interface:
 *
 * @interface SubstackHarvestorConfig
 * @property {CheckIfCatchedAlready} checkIfCatchedAlready - Function to check if an article has been previously processed.
 * @property {Login} login - Function to log into the Substack platform.
 * @property {RetrievePage} retrievePage - Function to retrieve a page of articles from a Substack publication.
 * @property {WritePdf} writePdf - Function to write an article's content into a PDF file.
 * @property {MarkAsProcessed} markAsProcessed - Function to mark an article as processed.
 * @property {DownloadAudio} downloadAudio - Function to download audio files associated with an article.
 *
 * @returns A function that takes a `SubstackHarvestor` object (defining the publication), a `limit` for the number of articles per page, and an optional `maxPage` to limit the total number of pages.
 *
 * @example
 * const config: SubstackHarvestorConfig = { checkIfCatchedAlready, login, ... };
 * const harvester = Harvest(config);
 * const result = harvester({ publisherUrl: '...', pubId: '...' }, 10, 5);  // Harvest up to 5 pages of 10 articles each.
 */
export const Harvest: Reader<
  {
    // screaming that you need to cache the already harvested article
    // and stored credential in a storage
    checkIfCatchedAlready: CheckIfCatchedAlready;
    login: Login;
    retrievePage: RetrievePage;
    writePdf: WritePdf;
    markAsProcessed: MarkAsProcessed;
    downloadAudio: DownloadAudio;
  },
  (
    substackHavestor: SubstackHarvestor,
    limit: number,
    maxPage?: number,
  ) => TaskEither<Error, any>
> =
  ({
    checkIfCatchedAlready,
    login,
    retrievePage,
    writePdf,
    markAsProcessed,
    downloadAudio,
  }) =>
  (substackHavestor, limit, maxPage = PageNumTrait.MAX_PAGE) => {
    const loopOverTheArticles = (posts: Post[]) => {
      return LoopableTrait.ofTE<{
        results: any[];
        nextIndex: number;
      }>((params: { idx: number; results: any[] }) =>
        pipe(
          posts[params.idx].id,
          checkIfCatchedAlready,
          TE.chain((isProcess) =>
            isProcess
              ? TE.right(null)
              : pipe(
                  posts[params.idx],
                  writePdf(substackHavestor),
                  TE.bindTo("pdf"),
                  TE.chain(() =>
                    markAsProcessed(
                      posts[params.idx].id,
                      posts[params.idx].title,
                    ),
                  ),
                  TE.bind("audio", () =>
                    pipe(
                      posts[params.idx].audio,
                      TE.traverseArray(downloadAudio(posts[params.idx].id)),
                    ),
                  ),
                ),
          ),
          TE.map((r) => ({
            results: [...params.results, r],
            nextIndex: params.idx + 1,
          })),
        ),
      )(
        (r) => r.nextIndex < posts.length,
        (r) => [{ idx: r.nextIndex, results: r.results }],
      );
    };
    const loopOverThePages = LoopableTrait.ofTE(
      (param: { page: PageNum; limit: number }) =>
        pipe(
          { page: param.page, limit: param.limit },
          retrievePage(substackHavestor),
          TE.chain((posts) =>
            LoopableTrait.loop(loopOverTheArticles(posts))({
              idx: 0,
              results: [],
            }),
          ),
          TE.map((result) => ({
            nextPage: param.page + 1,
            result: result?.results,
          })),
        ),
    )(
      (result) =>
        (result?.result?.length || 0) > 0 &&
        (PageNumTrait.isInfinity(maxPage) || result.nextPage <= maxPage),
      (r) => [{ page: r.nextPage, limit }],
    );
    return pipe(
      login(substackHavestor),
      TE.bindTo("login"),
      TE.bind("printsPdf", () =>
        LoopableTrait.loop(loopOverThePages)({ page: 0, limit }),
      ),
    );
  };
