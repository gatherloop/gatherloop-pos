import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
      const { getByText } = render(<CategoryCreateHandler {...createProps()} />);
      expect(getByText('Submit')).toBeTruthy();
    });

    it('should render the name input field', () => {
      const { container } = render(<CategoryCreateHandler {...createProps()} />);
      expect(container.querySelector('#name')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/categories" after successful creation', async () => {
      const { container, getByText } = render(<CategoryCreateHandler {...createProps()} />);

      const nameInput = container.querySelector('#name') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'New Category' } });
      fireEvent.click(getByText('Submit'));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/categories');
    });

    it('should not navigate when creation fails', async () => {
      const { container, getByText } = render(
        <CategoryCreateHandler {...createProps({ shouldFail: true })} />
      );

      const nameInput = container.querySelector('#name') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'New Category' } });
      fireEvent.click(getByText('Submit'));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when name field is empty (validation fails)', async () => {
      const { getByText } = render(<CategoryCreateHandler {...createProps()} />);

      fireEvent.click(getByText('Submit'));

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
