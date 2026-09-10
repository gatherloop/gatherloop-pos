import axios from 'axios';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { publicTableFindByCode } from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
import {
  PublicTableRepository,
  TableNotFoundError,
} from '../../domain/repositories/publicTable';
import { toPublicTable } from './publicTable.transformer';

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
