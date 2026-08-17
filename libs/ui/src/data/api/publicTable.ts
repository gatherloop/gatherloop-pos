import axios from 'axios';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { publicTableFindByCode } from '../../../../api-contract/src';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import {
  PublicTableRepository,
  TableNotFoundError,
} from '../../domain/repositories/publicTable';
import { toPublicTable } from './publicTable.transformer';

export class ApiPublicTableRepository implements PublicTableRepository {
  resolveTableByCode: PublicTableRepository['resolveTableByCode'] = (
    code
  ) => {
    return publicTableFindByCode(code)
      .then(({ data }) => toPublicTable(data))
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new TableNotFoundError();
        }
        throw error;
      });
  };
}
