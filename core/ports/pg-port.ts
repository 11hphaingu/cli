import { TaskEither } from "fp-ts/lib/TaskEither";
import { Reader } from "fp-ts/lib/Reader";
import { Client, QueryResultRow } from "pg";
import { TE } from "yl-ddd-ts/logic";

export interface SqlPort<E> {
  query: <R extends E>(
    qs: string,
    params: (string | number | boolean)[],
  ) => TaskEither<
    Error,
    {
      rows: R[];
      count: number;
    }
  >;
}

export interface PgPort extends SqlPort<QueryResultRow> {}

export const getPgPort: Reader<
  {
    pgconfig: {
      host: string;
      port: number;
      username: string;
      pwd: string;
      db: string;
    };
  },
  PgPort
> = ({ pgconfig }) => {
  const pgClient = new Client({
    host: pgconfig.host,
    port: pgconfig.port,
    database: pgconfig.db,
    user: pgconfig.username,
    password: pgconfig.pwd,
  });
  return {
    query: <R extends QueryResultRow>(
      qs: string,
      params: (string | number | boolean)[],
    ) =>
      TE.tryCatch(
        async () => {
          const result = await pgClient.query<R>(qs, params);
          return {
            rows: result.rows,
            count: result.rowCount || 0,
          };
        },
        (e) => e as Error,
      ),
  };
};
