import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierUpdateHandler } from './SupplierUpdateHandler';
import { MockAuthRepository, MockSupplierRepository } from '../../data/mock';
import { AuthLogoutUsecase, SupplierUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    supplierId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const supplierId = options.supplierId ?? 1;
  const supplierRepo = new MockSupplierRepository();

  const preloadedSupplier = options.preloaded
    ? supplierRepo.suppliers.find((s) => s.id === supplierId) ?? null
    : null;

  if (options.shouldFail) supplierRepo.setShouldFail(true);

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    supplierUpdateUsecase: new SupplierUpdateUsecase(supplierRepo, {
      supplierId,
      supplier: preloadedSupplier,
    }),
  };
};

describe('SupplierUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the update form', async () => {
      render(<SupplierUpdateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should render pre-filled form when supplier is preloaded', async () => {
      render(<SupplierUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Supplier 1')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should render the name input field', async () => {
      render(<SupplierUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should render the address input field', async () => {
      render(<SupplierUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Address' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to "/suppliers" after successful update', async () => {
      const user = userEvent.setup();
      render(<SupplierUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Supplier');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/suppliers');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const supplierRepo = new MockSupplierRepository();
      const preloadedSupplier = supplierRepo.suppliers[0];
      const supplierUpdateUsecase = new SupplierUpdateUsecase(supplierRepo, {
        supplierId: preloadedSupplier.id,
        supplier: preloadedSupplier,
      });
      supplierRepo.setShouldFail(true);

      render(
        <SupplierUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          supplierUpdateUsecase={supplierUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Supplier');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<SupplierUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<SupplierUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const supplierRepo = new MockSupplierRepository();
      const preloadedSupplier = supplierRepo.suppliers[0];
      const supplierUpdateUsecase = new SupplierUpdateUsecase(supplierRepo, {
        supplierId: preloadedSupplier.id,
        supplier: preloadedSupplier,
      });
      supplierRepo.setShouldFail(true);

      render(
        <SupplierUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          supplierUpdateUsecase={supplierUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Supplier');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Supplier Error');
    });
  });
});
