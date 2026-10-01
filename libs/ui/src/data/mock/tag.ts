import { Tag, TagForm } from '../../domain/entities/Tag';
import { TagRepository } from '../../domain/repositories/tag';

const initialTags: Tag[] = [
  {
    id: 1,
    name: 'New',
    color: 'green',
    isHighlighted: true,
    sortOrder: 1,
    variantCount: 3,
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Best Seller',
    color: 'orange',
    isHighlighted: true,
    sortOrder: 2,
    variantCount: 5,
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockTagRepository implements TagRepository {
  tags: Tag[] = [...initialTags];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchTagList(): Promise<Tag[]> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch tags');
    }
    return [...this.tags];
  }

  async fetchTagById(tagId: number): Promise<Tag> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch tag');
    }
    const tag = this.tags.find((t) => t.id === tagId);
    if (!tag) throw new Error('Tag not found');
    return { ...tag };
  }

  async deleteTagById(tagId: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to delete tag');
    }
    this.tags = this.tags.filter((t) => t.id !== tagId);
  }

  async createTag(formValues: TagForm): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to create tag');
    }
    this.tags.push({
      id: this.nextId++,
      ...formValues,
      variantCount: 0,
      createdAt: new Date().toISOString(),
    });
  }

  async updateTag(formValues: TagForm, tagId: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to update tag');
    }
    const idx = this.tags.findIndex((t) => t.id === tagId);
    if (idx === -1) throw new Error('Tag not found');
    this.tags[idx] = { ...this.tags[idx], ...formValues };
  }

  reset() {
    this.tags = [...initialTags];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
