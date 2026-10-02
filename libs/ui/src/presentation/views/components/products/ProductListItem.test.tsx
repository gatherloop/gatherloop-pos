import { render, screen } from '@testing-library/react';
import { ProductListItem } from './ProductListItem';
import type { ProductTag, Tag } from '../../../../domain';

const buildTag = (id: number, name: string, sortOrder: number): Tag => ({
  id,
  name,
  color: 'green',
  isHighlighted: true,
  sortOrder,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const buildProductTag = (
  tag: Tag,
  scope: ProductTag['scope'],
  variantIds: number[]
): ProductTag => ({
  tag,
  scope,
  variantIds,
  taggedAt: '2024-01-01T00:00:00.000Z',
});

const baseProps = {
  name: 'Pancong',
  categoryName: 'Snacks',
  saleType: 'purchase' as const,
  status: 'published' as const,
};

describe('ProductListItem tag badges', () => {
  it('shows a product-scope tag by name', () => {
    render(
      <ProductListItem
        {...baseProps}
        tags={[buildProductTag(buildTag(1, 'Best Seller', 1), 'product', [1])]}
      />
    );

    expect(screen.getByText('Best Seller')).toBeTruthy();
  });

  it('names the variant on a variant-scope tag', () => {
    render(
      <ProductListItem
        {...baseProps}
        tags={[buildProductTag(buildTag(1, 'New', 1), 'variant', [10])]}
        variantNameById={{ 10: 'Ice Cream' }}
      />
    );

    expect(screen.getByText('New · Ice Cream')).toBeTruthy();
    expect(screen.queryByText('New')).toBeNull();
  });

  it('shows two badges and a +N overflow', () => {
    render(
      <ProductListItem
        {...baseProps}
        tags={[
          buildProductTag(buildTag(1, 'First', 1), 'product', [1]),
          buildProductTag(buildTag(2, 'Second', 2), 'product', [1]),
          buildProductTag(buildTag(3, 'Third', 3), 'product', [1]),
        ]}
      />
    );

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.queryByText('Third')).toBeNull();
    expect(screen.getByText('+1')).toBeTruthy();
  });
});
