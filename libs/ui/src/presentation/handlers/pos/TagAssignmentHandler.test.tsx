import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagAssignmentHandler } from './TagAssignmentHandler';
import {
  MockAuthRepository,
  MockTagRepository,
  MockVariantRepository,
  createMenuVariants,
  mockTags,
} from '../../../data/mock';
import { AuthLogoutUsecase, TagAssignmentUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: { taggedVariantIds?: number[]; shouldFail?: boolean } = {}
) => {
  const tagRepo = new MockTagRepository();
  const variantRepo = new MockVariantRepository();
  variantRepo.variants = createMenuVariants().map((variant) =>
    (options.taggedVariantIds ?? []).includes(variant.id)
      ? {
          ...variant,
          tags: [{ tag: mockTags[0], taggedAt: '2024-03-22T00:00:00.000Z' }],
        }
      : variant
  );
  if (options.shouldFail) tagRepo.setShouldFail(true);

  return {
    tagRepo,
    props: {
      authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
      tagAssignmentUsecase: new TagAssignmentUsecase(tagRepo, variantRepo, {
        tagId: mockTags[0].id,
      }),
    },
  };
};

const renderLoaded = async (
  options: Parameters<typeof createProps>[0] = {}
) => {
  const { tagRepo, props } = createProps(options);
  render(<TagAssignmentHandler {...props} />);
  await act(async () => {
    await flushPromises();
  });
  return { tagRepo };
};

const checkbox = (name: string) => screen.getByRole('checkbox', { name });

describe('TagAssignmentHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      const { props } = createProps();
      render(<TagAssignmentHandler {...props} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should group products by category', async () => {
      await renderLoaded();

      expect(screen.getByRole('heading', { name: 'Snacks' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Drinks' })).toBeTruthy();
      expect(checkbox('Pancong')).toBeTruthy();
      expect(checkbox('Salted Caramel Macchiato')).toBeTruthy();
      expect(checkbox('Coffee Latte')).toBeTruthy();
    });

    it('should show an error view and refetch on retry', async () => {
      const user = userEvent.setup();
      const { tagRepo } = await renderLoaded({ shouldFail: true });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Products' })
      ).toBeTruthy();

      tagRepo.setShouldFail(false);
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      await act(async () => {
        await flushPromises();
      });

      expect(checkbox('Pancong')).toBeTruthy();
    });
  });

  describe('checkbox states', () => {
    it('should render unchecked, checked and indeterminate products', async () => {
      await renderLoaded({ taggedVariantIds: [104, 105, 106, 107] });

      expect(checkbox('Pancong').getAttribute('aria-checked')).toBe('mixed');
      expect(
        checkbox('Salted Caramel Macchiato').getAttribute('aria-checked')
      ).toBe('true');
      expect(checkbox('Coffee Latte').getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('should hide the variant layer of a single-variant product', async () => {
      await renderLoaded();

      expect(
        screen.queryByRole('button', {
          name: 'Show variants of Salted Caramel Macchiato',
        })
      ).toBeNull();
      expect(
        screen.queryByRole('checkbox', {
          name: 'Salted Caramel Macchiato Original',
        })
      ).toBeNull();
    });

    it('should tick every variant when a product is ticked', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(checkbox('Coffee Latte'));
      await user.click(
        screen.getByRole('button', { name: 'Show variants of Coffee Latte' })
      );

      expect(checkbox('Coffee Latte').getAttribute('aria-checked')).toBe(
        'true'
      );
      expect(checkbox('Coffee Latte Hot').getAttribute('aria-checked')).toBe(
        'true'
      );
      expect(checkbox('Coffee Latte Iced').getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('should make a product indeterminate when one of its variants is unticked', async () => {
      const user = userEvent.setup();
      await renderLoaded({ taggedVariantIds: [106, 107] });

      await user.click(
        screen.getByRole('button', { name: 'Show variants of Coffee Latte' })
      );
      await user.click(checkbox('Coffee Latte Iced'));

      expect(checkbox('Coffee Latte').getAttribute('aria-checked')).toBe(
        'mixed'
      );
      expect(checkbox('Coffee Latte Hot').getAttribute('aria-checked')).toBe(
        'true'
      );
      expect(checkbox('Coffee Latte Iced').getAttribute('aria-checked')).toBe(
        'false'
      );
    });
  });

  describe('search', () => {
    it('should filter products by name', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.type(
        screen.getByPlaceholderText('Search Products by Name'),
        'latte'
      );

      expect(checkbox('Coffee Latte')).toBeTruthy();
      expect(screen.queryByRole('checkbox', { name: 'Pancong' })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Snacks' })).toBeNull();
    });

    it('should show the empty view when nothing matches', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.type(
        screen.getByPlaceholderText('Search Products by Name'),
        'zzz'
      );

      expect(
        screen.getByRole('heading', { name: 'Oops, Product is Empty' })
      ).toBeTruthy();
    });
  });

  describe('saving', () => {
    it('should send exactly the ticked variant ids, toast and navigate back to the tag list', async () => {
      const user = userEvent.setup();
      const { tagRepo } = await renderLoaded({ taggedVariantIds: [104] });

      await user.click(checkbox('Salted Caramel Macchiato'));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {
        await flushPromises();
      });

      expect(tagRepo.lastSubmittedVariantIds).toEqual([104, 105]);
      expect(mockToastShow).toHaveBeenCalledWith('Assign Tag Success');
      expect(mockRouterPush).toHaveBeenCalledWith('/tags');
    });

    it('should show an error toast and stay on the page when saving fails', async () => {
      const user = userEvent.setup();
      const { tagRepo } = await renderLoaded();

      tagRepo.setShouldFail(true);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Assign Tag Error');
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});
