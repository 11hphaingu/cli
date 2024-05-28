import {
  CheckIfCatchedAlready,
  DownloadAudio,
  Login,
  MarkAsProcessed,
  Post,
  RetrievePage,
  WritePdf,
  harvest,
} from "core/substack/harvester.base";
import { Either, TE, absordTE, pipe } from "yl-ddd-ts";
import { aufn } from "yl-ddd-ts";

describe("test havester core", () => {
  const maxPage = 10;
  const idToIsCatched = (id: string) => id.startsWith("catched");
  const checkIfCatchedAlready: CheckIfCatchedAlready = (id: string) => {
    if (idToIsCatched(id)) {
      ignored.push(id);
    }
    return TE.right(idToIsCatched(id));
  };
  const login: Login = () => absordTE(TE.right(null));
  const processed: string[] = [];
  const ignored: string[] = [];
  const markAsProcessed: MarkAsProcessed = (id: string) => {
    processed.push(id);
    return absordTE(TE.right(null));
  };
  const downloadAudio: DownloadAudio = () => absordTE(TE.right(null));
  const getPdf: WritePdf = () => absordTE(TE.right(null));
  const retrievePage: RetrievePage =
    () =>
    ({ page, limit }) => {
      return TE.right(
        page < maxPage
          ? Array.from(Array(limit)).map(
              (v, index) =>
                ({
                  id: `${aufn.randomItem(["catched_", "new_"])}-${page}-${index}`,
                  canonicalUrl: "http://mock.com",
                  title: "mock",
                  audio: ["http://mock.com/audio"],
                }) as Post,
            )
          : [],
      );
    };
  it("test havest", async () => {
    const LIMIT = 10;
    const result = await harvest({
      checkIfCatchedAlready,
      login,
      retrievePage,
      writePdf: getPdf,
      markAsProcessed,
      downloadAudio,
    })("https://substack.com", LIMIT)();
    pipe(
      result,
      Either.match(
        (e) => {
          throw e;
        },
        (result) => {
          console.log("result ", result);
          expect(processed.every((p) => !idToIsCatched(p))).toBe(true);
          expect(ignored.every((p) => idToIsCatched(p))).toBe(true);
          expect(processed.length + ignored.length).toBe(LIMIT * maxPage);
        },
      ),
    );
  });
});
