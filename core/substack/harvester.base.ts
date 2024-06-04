import { LoopableTrait } from "core/fp/recur-return";
import { Reader } from "fp-ts/lib/Reader";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { TE, pipe } from "yl-ddd-ts";

export type CheckIfCatchedAlready = (id: string) => TaskEither<Error, boolean>;

export type Login = (havestor: SubstackHarvestor) => TaskEither<Error, void>;

export type Post = {
  id: string;
  canonicalUrl: string;
  title: string;
  audio: string[];
};

export type MarkAsProcessed = (
  id: string,
  title: string,
) => TaskEither<Error, void>;

export type DownloadAudio = (
  id: string,
) => (audio: string) => TaskEither<Error, void>;

export interface SubstackHarvestor {
  publisherUrl: string;
  pubId: string;
}
export type RetrievePage = (
  harvestor: SubstackHarvestor,
) => (pagParam: { page: number; limit: number }) => TaskEither<Error, Post[]>;

export type WritePdf = (
  harvestor: SubstackHarvestor,
) => (post: Post) => TaskEither<Error, void>;
export type PageNum = number;
export const PageNumTrait = {
  isInfinity: (page: PageNum) => page === PageNumTrait.MAX_PAGE,
  MAX_PAGE: -1,
};
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
