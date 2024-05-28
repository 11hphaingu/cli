import { LoopableTrait } from "core/fp/recur-return";
import { Reader } from "fp-ts/lib/Reader";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { TE, pipe } from "yl-ddd-ts";

export type CheckIfCatchedAlready = (id: string) => TaskEither<Error, boolean>;

export type Login = () => TaskEither<Error, void>;

export type Post = {
  id: string;
  canonicalUrl: string;
  title: string;
  audio: string[];
};

export type MarkAsProcessed = (id: string) => TaskEither<Error, void>;

export type DownloadAudio = (audio: string) => TaskEither<Error, void>;

export type RetrievePage = (
  publisherUrl: string,
) => (pagParam: { page: number; limit: number }) => TaskEither<Error, Post[]>;

export type WritePdf = (post: Post) => TaskEither<Error, void>;

export interface SubstackHarvestor {
  publisherUrl: string;
}

export const harvest: Reader<
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
  (publisherUrl: string, limit: number) => TaskEither<Error, any>
> =
  ({
    checkIfCatchedAlready,
    login,
    retrievePage,
    writePdf,
    markAsProcessed,
    downloadAudio,
  }) =>
  (publisherUrl, limit) => {
    const loopOverTheArticles = LoopableTrait.ofTE(
      (param: { page: number; limit: number }) =>
        pipe(
          { page: param.page, limit: param.limit },
          retrievePage(publisherUrl),
          TE.chain(
            TE.traverseArray((post) => {
              return pipe(
                post.id,
                checkIfCatchedAlready,
                TE.chain((isProcess) =>
                  isProcess
                    ? TE.right(null)
                    : pipe(
                        post,
                        writePdf,
                        TE.bindTo("pdf"),
                        TE.bind("audio", () =>
                          pipe(post.audio, TE.traverseArray(downloadAudio)),
                        ),
                        TE.chain(() => markAsProcessed(post.id)),
                      ),
                ),
              );
            }),
          ),
          TE.map((results) => ({
            nextPage: param.page + 1,
            result: results,
          })),
        ),
    )(
      (result) => result.result.length > 0,
      (r) => [{ page: r.nextPage, limit }],
    );
    return pipe(
      login(),
      TE.bindTo("login"),
      TE.bind("printsPdf", () =>
        LoopableTrait.loop(loopOverTheArticles)({ page: 0, limit }),
      ),
    );
  };
