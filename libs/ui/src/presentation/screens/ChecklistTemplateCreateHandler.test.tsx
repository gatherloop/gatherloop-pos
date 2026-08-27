import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChecklistTemplateCreateHandler } from './ChecklistTemplateCreateHandler';
import { MockAuthRepository, MockChecklistTemplateRepository } from '../../data/mock';
import { AuthLogoutUsecase, ChecklistTemplateCreateUsecase } from '../../domain';
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
  const checklistTemplateRepo = new MockChecklistTemplateRepository();
  if (options.shouldFail) checklistTemplateRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    checklistTemplateCreateUsecase: new ChecklistTemplateCreateUsecase(
      checklistTemplateRepo
    ),
  };
};

// The form starts with no items; the schema requires at least one, so tests
// that need a successful submit add one item first.
const fillOneItem = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Add Item' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Item Name' }),
    'Turn on lights'
  );
};

describe('ChecklistTemplateCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<ChecklistTemplateCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the template name field', () => {
      render(<ChecklistTemplateCreateHandler {...createProps()} />);
      expect(
        screen.getByRole('textbox', { name: 'Template Name' })
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/checklist-templates" after successful creation', async () => {
      const user = userEvent.setup();
      render(<ChecklistTemplateCreateHandler {...createProps()} />);

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await fillOneItem(user);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/checklist-templates');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(
        <ChecklistTemplateCreateHandler {...createProps({ shouldFail: true })} />
      );

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await fillOneItem(user);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when the template has no items (validation fails)', async () => {
      const user = userEvent.setup();
      render(<ChecklistTemplateCreateHandler {...createProps()} />);

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when template name is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<ChecklistTemplateCreateHandler {...createProps()} />);

      await fillOneItem(user);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Template name is required')).toBeTruthy();
    });

    it('should not submit when there are no items', async () => {
      const user = userEvent.setup();
      render(<ChecklistTemplateCreateHandler {...createProps()} />);

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(
        <ChecklistTemplateCreateHandler {...createProps({ shouldFail: true })} />
      );

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await fillOneItem(user);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith(
        'Create Checklist Template Error'
      );
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(
        <ChecklistTemplateCreateHandler {...createProps({ shouldFail: true })} />
      );

      await user.type(
        screen.getByRole('textbox', { name: 'Template Name' }),
        'New Checklist'
      );
      await fillOneItem(user);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByText('Failed to submit. Please try again.')
      ).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<ChecklistTemplateCreateHandler {...createProps()} />);
      expect(
        screen.queryByText('Failed to submit. Please try again.')
      ).toBeNull();
    });
  });
});
