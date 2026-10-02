import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagListHandler } from './TagListHandler';
import { MockAuthRepository, MockTagRepository } from '../../../data/mock';
import {
  AuthLogoutUsecase,
  TagDeleteUsecase,
  TagListUsecase,
} from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    tagRepo?: MockTagRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const tagRepo = options.tagRepo ?? new MockTagRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    tagListUsecase: new TagListUsecase(tagRepo, { tags: [] }),
    tagDeleteUsecase: new TagDeleteUsecase(tagRepo),
  };
};

describe('TagListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<TagListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show tag list after successful fetch', async () => {
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'New' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Best Seller' })).toBeTruthy();
    });

    it('should show the variant count for each tag', async () => {
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('3 variants')).toBeTruthy();
      expect(screen.getByText('5 variants')).toBeTruthy();
    });

    it('should show the highlighted flag for each tag', async () => {
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByText('Highlighted').length).toBe(2);
    });

    it('should show error state when fetch fails', async () => {
      const tagRepo = new MockTagRepository();
      tagRepo.setShouldFail(true);

      render(<TagListHandler {...createProps({ tagRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tags' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect(screen.queryByTestId('skeleton-list')).toBeNull();

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no tags exist', async () => {
      const tagRepo = new MockTagRepository();
      tagRepo.tags = [];

      render(<TagListHandler {...createProps({ tagRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Tag is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const tagRepo = new MockTagRepository();
      tagRepo.tags = [];
      render(<TagListHandler {...createProps({ tagRepo })} />);
      await act(async () => { await flushPromises(); });
      expect(screen.getByRole('button', { name: 'Create Tag' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      tagRepo.tags = [];
      render(<TagListHandler {...createProps({ tagRepo })} />);
      await act(async () => { await flushPromises(); });
      await user.click(screen.getByRole('button', { name: 'Create Tag' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/tags/create');
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Tag ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Tag ?' })).toBeTruthy();
    });

    it('should state how many variants carry the tag in the delete modal', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByText(/applied to 3 variants/)).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Tag ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Tag ?' })).toBeNull();
    });

    it('should disable Yes button and show spinner during deletion', async () => {
      const user = userEvent.setup();
      let resolveDelete!: () => void;
      const tagRepo = new MockTagRepository();
      jest.spyOn(tagRepo, 'deleteTagById').mockImplementation(
        () => new Promise<void>((resolve) => { resolveDelete = resolve; })
      );

      render(<TagListHandler {...createProps({ tagRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect((screen.getByRole('button', { name: 'Yes' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('spinner')).toBeTruthy();

      await act(async () => {
        resolveDelete();
        await flushPromises();
      });

      expect(screen.queryByTestId('spinner')).toBeNull();
    });

    it('should refetch tag list after successful delete', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      render(<TagListHandler {...createProps({ tagRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'New' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Tag ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Tag ?' })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'New' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Best Seller' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to tag edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/tags/1');
    });

    it('should navigate to tag assignment page when assign menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const assignMenuItems = screen.getAllByRole('button', {
        name: 'Assign products',
      });
      await user.click(assignMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/tags/1/assign');
    });

    it('should navigate to tag page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<TagListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'New' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/tags/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch tags when retry button is pressed', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      tagRepo.setShouldFail(true);

      render(<TagListHandler {...createProps({ tagRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tags' })).toBeTruthy();

      tagRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'New' })).toBeTruthy();
    });
  });
});
