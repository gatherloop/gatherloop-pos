import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChecklistTemplateUpdateHandler } from './ChecklistTemplateUpdateHandler';
import { MockAuthRepository, MockChecklistTemplateRepository } from '../../data/mock';
import { AuthLogoutUsecase, ChecklistTemplateUpdateUsecase } from '../../domain';
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
    checklistTemplateId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const checklistTemplateId = options.checklistTemplateId ?? 1;
  const checklistTemplateRepo = new MockChecklistTemplateRepository();
  if (options.shouldFail) checklistTemplateRepo.setShouldFail(true);

  const preloadedChecklistTemplate = options.preloaded
    ? checklistTemplateRepo.checklistTemplates.find(
        (t) => t.id === checklistTemplateId
      ) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    checklistTemplateUpdateUsecase: new ChecklistTemplateUpdateUsecase(
      checklistTemplateRepo,
      {
        checklistTemplateId,
        checklistTemplate: preloadedChecklistTemplate,
      }
    ),
  };
};

describe('ChecklistTemplateUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await flushPromises();
    });
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching checklist template', async () => {
      render(<ChecklistTemplateUpdateHandler {...createProps()} />);
      expect(
        screen.getByText('Fetching Checklist Template...')
      ).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after checklist template data loads', async () => {
      render(<ChecklistTemplateUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when checklist template is preloaded', async () => {
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ preloaded: true })}
        />
      );
      expect(screen.getByDisplayValue('Opening Checklist')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should fill the form with fetched values when data loads after mount', async () => {
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ preloaded: false })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByDisplayValue('Opening Checklist')).toBeTruthy();
      expect(screen.getByDisplayValue('Turn on lights')).toBeTruthy();
    });

    it('should show error state when checklist template fetch fails', async () => {
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ shouldFail: true })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', {
          name: 'Failed to Fetch Checklist Template',
        })
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/checklist-templates" after successful update', async () => {
      const user = userEvent.setup();
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ preloaded: true })}
        />
      );

      const nameInput = screen.getByRole('textbox', {
        name: 'Template Name',
      });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Checklist');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/checklist-templates');
    });

    it('should not navigate without user interaction', async () => {
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ preloaded: true })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when template name is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ChecklistTemplateUpdateHandler
          {...createProps({ preloaded: true })}
        />
      );

      const nameInput = screen.getByRole('textbox', {
        name: 'Template Name',
      });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Template name is required')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    // ChecklistTemplateUpdateUsecase dispatches SUBMIT_CANCEL as soon as it
    // observes `submitError` (see checklistTemplateUpdate.ts), so the state
    // returns to `loaded` on its own right after the failure - the error
    // banner is too transient to assert on. The toast fires on the same
    // render as the failure, so it is the reliable signal here.
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const checklistTemplateRepo = new MockChecklistTemplateRepository();
      const preloaded = checklistTemplateRepo.checklistTemplates[0];
      const checklistTemplateUpdateUsecase = new ChecklistTemplateUpdateUsecase(
        checklistTemplateRepo,
        { checklistTemplateId: preloaded.id, checklistTemplate: preloaded }
      );
      checklistTemplateRepo.setShouldFail(true);

      render(
        <ChecklistTemplateUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          checklistTemplateUpdateUsecase={checklistTemplateUpdateUsecase}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith(
        'Update Checklist Template Error'
      );
    });
  });

  describe('error recovery', () => {
    it('should refetch checklist template when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const checklistTemplateRepo = new MockChecklistTemplateRepository();
      checklistTemplateRepo.setShouldFail(true);

      render(
        <ChecklistTemplateUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          checklistTemplateUpdateUsecase={
            new ChecklistTemplateUpdateUsecase(checklistTemplateRepo, {
              checklistTemplateId: 1,
              checklistTemplate: null,
            })
          }
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', {
          name: 'Failed to Fetch Checklist Template',
        })
      ).toBeTruthy();

      checklistTemplateRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
