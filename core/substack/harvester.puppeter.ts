import { Reader } from "fp-ts/lib/Reader";
import { StoreUtils } from "./harvester.base";
import { PgPort } from "core/ports/pg-port";

export const storeUtilsWithPG: Reader<
  {
    pgPort: PgPort;
  },
  StoreUtils<{ user: string; pwd: string }>
> = ({ pgPort }) => {
  return {
    checkIfCatchedAlready: (articleSlug: string) => {
      pgPort.query(
        "select count(article.id) from article where article.slug = :slug",
        [articleSlug],
      );
    },
  };
};
