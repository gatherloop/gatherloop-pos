import axios from 'axios';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { publicTableFindByCode } from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import {
  PublicTableRepository,
  TableNotFoundError,
} from '../../domain/repositories/publicTable';
import { toPublicTable } from './publicTable.transformer';

// `withCredentials: false` (D22 in docs/prd-table-ordering.md, D3 in
// docs/trd-order-app-composition-and-ssr.md): the order app sends no auth
// cookie, and this used to be a global axios default flipped by an
// interceptor. Set per request instead.
const withoutCredentials = (options?: Partial<RequestConfig>) => ({
  ...options,
  withCredentials: false,
});

export class ApiPublicTableRepository implements PublicTableRepository {
  resolveTableByCode: PublicTableRepository['resolveTableByCode'] = (
    code,
    options
  ) => {
    return publicTableFindByCode(code, withoutCredentials(options))
      .then(({ data }) => toPublicTable(data))
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new TableNotFoundError();
        }
        throw error;
      });
  };
}
