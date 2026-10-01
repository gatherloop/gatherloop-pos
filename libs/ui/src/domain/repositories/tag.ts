import { Tag, TagForm } from '../entities';

export interface TagRepository {
  fetchTagList: () => Promise<Tag[]>;

  fetchTagById: (tagId: number) => Promise<Tag>;

  deleteTagById: (tagId: number) => Promise<void>;

  createTag: (formValues: TagForm) => Promise<void>;

  updateTag: (formValues: TagForm, tagId: number) => Promise<void>;

  setTagVariants: (tagId: number, variantIds: number[]) => Promise<void>;
}
