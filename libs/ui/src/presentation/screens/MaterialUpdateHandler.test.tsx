import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialUpdateHandler } from './MaterialUpdateHandler';
import { MockAuthRepository, MockMaterialRepository } from '../../data/mock';
import { AuthLogoutUsecase, MaterialUpdateUsecase } from '../../domain';
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
    materialId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const materialId = options.materialId ?? 1;
  const materialRepo = new MockMaterialRepository();

  const preloadedMaterial = options.preloaded
    ? materialRepo.materials.find((m) => m.id === materialId) ?? null
    : null;

  if (options.shouldFail) materialRepo.shouldFail = true;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    materialUpdateUsecase: new MaterialUpdateUsecase(materialRepo, {
      materialId,
      material: preloadedMaterial,
    }),
  };
};

describe('MaterialUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the update form', () => {
      render(<MaterialUpdateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when material is preloaded', () => {
      render(<MaterialUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Material 1')).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<MaterialUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });

    it('should render the unit input field', () => {
      render(<MaterialUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Unit' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/materials" after successful update', async () => {
      const user = userEvent.setup();
      render(<MaterialUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Material');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const materialRepo = new MockMaterialRepository();
      const preloadedMaterial = materialRepo.materials[0];
      const materialUpdateUsecase = new MaterialUpdateUsecase(materialRepo, {
        materialId: preloadedMaterial.id,
        material: preloadedMaterial,
      });
      materialRepo.shouldFail = true;

      render(
        <MaterialUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          materialUpdateUsecase={materialUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Material');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<MaterialUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<MaterialUpdateHandler {...createProps({ preloaded: true })} />);

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
      const materialRepo = new MockMaterialRepository();
      const preloadedMaterial = materialRepo.materials[0];
      const materialUpdateUsecase = new MaterialUpdateUsecase(materialRepo, {
        materialId: preloadedMaterial.id,
        material: preloadedMaterial,
      });
      materialRepo.shouldFail = true;

      render(
        <MaterialUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          materialUpdateUsecase={materialUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Material');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Material Error');
    });
  });
});
