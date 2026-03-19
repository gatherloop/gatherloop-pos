import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialListHandler } from './MaterialListHandler';
import {
  MockAuthRepository,
  MockMaterialRepository,
  MockMaterialListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  MaterialDeleteUsecase,
  MaterialListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    materialRepo?: MockMaterialRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const materialRepo = options.materialRepo ?? new MockMaterialRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    materialListUsecase: new MaterialListUsecase(
      materialRepo,
      new MockMaterialListQueryRepository(),
      { materials: [], totalItem: 0 }
    ),
    materialDeleteUsecase: new MaterialDeleteUsecase(materialRepo),
  };
};

describe('MaterialListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', () => {
      render(<MaterialListHandler {...createProps()} />);
      expect(screen.getByText('Fetching Materials...')).toBeTruthy();
    });

    it('should show material list after successful fetch', async () => {
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Material 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Material 2' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const materialRepo = new MockMaterialRepository();
      materialRepo.shouldFail = true;

      render(<MaterialListHandler {...createProps({ materialRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Materials' })).toBeTruthy();
    });

    it('should show empty state when no materials exist', async () => {
      const materialRepo = new MockMaterialRepository();
      materialRepo.materials = [];

      render(<MaterialListHandler {...createProps({ materialRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Material is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Material ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Material ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Material ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Material ?' })).toBeNull();
    });

    it('should refetch material list after successful delete', async () => {
      const user = userEvent.setup();
      const materialRepo = new MockMaterialRepository();
      render(<MaterialListHandler {...createProps({ materialRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Material 1' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Material ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Material ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Material 2' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to material edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/materials/1');
    });

    it('should navigate to material page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<MaterialListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Material 1' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/materials/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch materials when retry button is pressed', async () => {
      const user = userEvent.setup();
      const materialRepo = new MockMaterialRepository();
      materialRepo.shouldFail = true;

      render(<MaterialListHandler {...createProps({ materialRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Materials' })).toBeTruthy();

      materialRepo.shouldFail = false;

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Material 1' })).toBeTruthy();
    });
  });
});
