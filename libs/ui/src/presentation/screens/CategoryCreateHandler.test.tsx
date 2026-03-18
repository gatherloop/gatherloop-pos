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

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
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
});
