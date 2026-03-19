import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialCreateHandler } from './MaterialCreateHandler';
import { MockAuthRepository, MockMaterialRepository } from '../../data/mock';
import { AuthLogoutUsecase, MaterialCreateUsecase } from '../../domain';
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
  const materialRepo = new MockMaterialRepository();
  if (options.shouldFail) materialRepo.shouldFail = true;
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    materialCreateUsecase: new MaterialCreateUsecase(materialRepo),
  };
};

describe('MaterialCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<MaterialCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<MaterialCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });

    it('should render the unit input field', () => {
      render(<MaterialCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Unit' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/materials" after successful creation', async () => {
      const user = userEvent.setup();
      render(<MaterialCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Material');
      await user.type(screen.getByRole('textbox', { name: 'Unit' }), 'kg');
      const priceInput = screen.getByRole('textbox', { name: 'Price' });
      await user.click(priceInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.keyboard('1');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<MaterialCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Material');
      await user.type(screen.getByRole('textbox', { name: 'Unit' }), 'kg');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when name field is empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<MaterialCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<MaterialCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByText('String must contain at least 1 character(s)').length).toBeGreaterThan(0);
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(<MaterialCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Material');
      await user.type(screen.getByRole('textbox', { name: 'Unit' }), 'kg');
      const priceInput = screen.getByRole('textbox', { name: 'Price' });
      await user.click(priceInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.keyboard('1');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Material Error');
    });
  });
});
