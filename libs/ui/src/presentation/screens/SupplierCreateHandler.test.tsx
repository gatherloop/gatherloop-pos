import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierCreateHandler } from './SupplierCreateHandler';
import { MockAuthRepository, MockSupplierRepository } from '../../data/mock';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../../domain';
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
  const supplierRepo = new MockSupplierRepository();
  if (options.shouldFail) supplierRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    supplierCreateUsecase: new SupplierCreateUsecase(supplierRepo),
  };
};

describe('SupplierCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<SupplierCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<SupplierCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });

    it('should render the address input field', () => {
      render(<SupplierCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Address' })).toBeTruthy();
    });

    it('should render the maps link input field', () => {
      render(<SupplierCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Maps Link' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/suppliers" after successful creation', async () => {
      const user = userEvent.setup();
      render(<SupplierCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Supplier');
      await user.type(screen.getByRole('textbox', { name: 'Address' }), 'Jl. New No. 1');
      await user.type(
        screen.getByRole('textbox', { name: 'Maps Link' }),
        'https://maps.google.com/?q=new'
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/suppliers');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<SupplierCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Supplier');
      await user.type(screen.getByRole('textbox', { name: 'Address' }), 'Jl. New No. 1');
      await user.type(
        screen.getByRole('textbox', { name: 'Maps Link' }),
        'https://maps.google.com/?q=new'
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when name field is empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<SupplierCreateHandler {...createProps()} />);

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
      render(<SupplierCreateHandler {...createProps()} />);

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
      render(<SupplierCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Supplier');
      await user.type(screen.getByRole('textbox', { name: 'Address' }), 'Jl. New No. 1');
      await user.type(
        screen.getByRole('textbox', { name: 'Maps Link' }),
        'https://maps.google.com/?q=new'
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Supplier Error');
    });
  });
});
