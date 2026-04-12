import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryCreateHandler } from './CategoryCreateHandler';
import { MockAuthRepository, MockCategoryRepository } from '../../data/mock';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const categoryRepo = new MockCategoryRepository();
  if (options.shouldFail) categoryRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    categoryCreateUsecase: new CategoryCreateUsecase(categoryRepo),
  };
};

describe('CategoryCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<CategoryCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<CategoryCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/categories" after successful creation', async () => {
      const user = userEvent.setup();
      render(<CategoryCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/categories');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<CategoryCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when name field is empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<CategoryCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without any user interaction', async () => {
      render(<CategoryCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<CategoryCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('loading states', () => {
    it('should disable submit button and show spinner while submitting', async () => {
      const user = userEvent.setup();
      let resolveCreate!: () => void;
      const categoryRepo = new MockCategoryRepository();
      jest.spyOn(categoryRepo, 'createCategory').mockImplementation(
        () => new Promise<void>((resolve) => { resolveCreate = resolve; })
      );

      render(
        <CategoryCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          categoryCreateUsecase={new CategoryCreateUsecase(categoryRepo)}
        />
      );

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('spinner')).toBeTruthy();

      await act(async () => {
        resolveCreate();
        await flushPromises();
      });

      expect(screen.queryByTestId('spinner')).toBeNull();
      expect(mockRouterPush).toHaveBeenCalledWith('/categories');
    });

    it('should not disable submit button before any interaction', () => {
      render(<CategoryCreateHandler {...createProps()} />);
      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(<CategoryCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Category Error');
    });
  });
});
