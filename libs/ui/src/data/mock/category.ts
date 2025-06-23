import { Category, CategoryForm } from '../../domain/entities/Category';
import { CategoryRepository } from '../../domain/repositories/category';

export class MockCategoryRepository implements CategoryRepository {
  private categories: Category[] = [
    { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
    { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
  ];
  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchCategoryList(): Promise<Category[]> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch categories');
    }
    return [...this.categories];
  }

  async fetchCategoryById(categoryId: number): Promise<Category> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch category');
    }
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error('Category not found');
    return { ...category };
  }

  async deleteCategoryById(categoryId: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to delete category');
    }
    this.categories = this.categories.filter((c) => c.id !== categoryId);
  }

  async createCategory(formValues: CategoryForm): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to create category');
    }
    this.categories.push({
      id: this.nextId++,
      name: formValues.name,
      createdAt: new Date().toISOString(),
    });
  }

  async updateCategory(formValues: CategoryForm, categoryId: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to update category');
    }
    const idx = this.categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) throw new Error('Category not found');
    this.categories[idx] = {
      ...this.categories[idx],
      name: formValues.name,
    };
  }

  reset() {
    this.categories = [
      { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
      { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
    ];
    this.nextId = 3;
    this.shouldFail = false;
  }
} 