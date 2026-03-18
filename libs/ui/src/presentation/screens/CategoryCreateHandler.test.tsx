import React from 'react';
import { render, act } from '@testing-library/react';
import { CategoryCreateHandler } from './CategoryCreateHandler';
import { MockAuthRepository, MockCategoryRepository } from '../../data/mock';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

// Mock the Screen — tests focus on handler orchestration, not form rendering
jest.mock('./CategoryCreateScreen', () => ({
  CategoryCreateScreen: () => null,
}));

const categoryCreateCtrl = {
  state: {
    type: 'loaded' as string,
    errorMessage: null as string | null,
    values: { name: '' },
  },
  dispatch: jest.fn(),
  form: {} as never,
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useCategoryCreateController: () => ({
    state: categoryCreateCtrl.state,
    dispatch: categoryCreateCtrl.dispatch,
    form: categoryCreateCtrl.form,
  }),
  useAuthLogoutController: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  categoryCreateUsecase: new CategoryCreateUsecase(new MockCategoryRepository()),
});

describe('CategoryCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    categoryCreateCtrl.state = {
      type: 'loaded',
      errorMessage: null,
      values: { name: '' },
    };
    authLogoutCtrl.state = { type: 'idle' };
  });

  it('should navigate to "/categories" when create succeeds', async () => {
    categoryCreateCtrl.state = {
      type: 'submitSuccess',
      errorMessage: null,
      values: { name: 'New Category' },
    };

    await act(async () => {
      render(<CategoryCreateHandler {...createProps()} />);
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/categories');
  });

  it('should not navigate when state is loaded', async () => {
    categoryCreateCtrl.state = {
      type: 'loaded',
      errorMessage: null,
      values: { name: '' },
    };

    await act(async () => {
      render(<CategoryCreateHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when state is submitting', async () => {
    categoryCreateCtrl.state = {
      type: 'submitting',
      errorMessage: null,
      values: { name: 'New Category' },
    };

    await act(async () => {
      render(<CategoryCreateHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should not navigate when state is submitError', async () => {
    categoryCreateCtrl.state = {
      type: 'submitError',
      errorMessage: 'Failed to create',
      values: { name: 'New Category' },
    };

    await act(async () => {
      render(<CategoryCreateHandler {...createProps()} />);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
