import { Reader } from "fp-ts/lib/Reader";
import { TaskEither } from "fp-ts/lib/TaskEither";

type CheckIfCatchedAlready = (
  articleSlug: string,
) => TaskEither<Error, boolean>;
type GetCredential<Cre> = () => TaskEither<Error, Cre>;
export interface StoreUtils<Credential> {
  checkIfCatchedAlready: CheckIfCatchedAlready;
  getCredential: GetCredential<Credential>;
}

export interface SubstackHarvestor<Credential> {
  harvest: Reader<
    {
      // screaming that you need to cache the already harvested article
      // and stored credential in a storage
      store: StoreUtils<Credential>;
    },
    (publisherUrl: string) => TaskEither<Error, void>
  >;
}
