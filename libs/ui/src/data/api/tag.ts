import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  tagCreate,
  tagDeleteById,
  tagFindById,
  tagFindByIdQueryKey,
  tagList,
  tagListQueryKey,
  tagSetVariants,
  tagUpdateById,
} from '../../../../api-contract/src';
import { Tag, TagRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiTag, toTag } from './tag.transformer';

export class ApiTagRepository implements TagRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchTagById = (tagId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: tagFindByIdQueryKey(tagId),
        queryFn: () => tagFindById(tagId, options),
      })
      .then(({ data }) => toTag(data));
  };

  createTag: TagRepository['createTag'] = (formValues) => {
    return tagCreate(toApiTag(formValues)).then();
  };

  updateTag: TagRepository['updateTag'] = (formValues, tagId) => {
    return tagUpdateById(tagId, toApiTag(formValues)).then();
  };

  setTagVariants: TagRepository['setTagVariants'] = (tagId, variantIds) => {
    return tagSetVariants(tagId, { variantIds }).then();
  };

  deleteTagById: TagRepository['deleteTagById'] = (tagId) => {
    return tagDeleteById(tagId).then();
  };

  fetchTagList = (options?: Partial<RequestConfig>): Promise<Tag[]> => {
    return this.client
      .fetchQuery({
        queryKey: tagListQueryKey(),
        queryFn: () => tagList(options),
      })
      .then((data) => data.data.map(toTag));
  };
}
