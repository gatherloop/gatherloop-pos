import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagCreateHandler } from './TagCreateHandler';
import { MockAuthRepository, MockTagRepository } from '../../../data/mock';
import { AuthLogoutUsecase, TagCreateUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const tagRepo = new MockTagRepository();
  if (options.shouldFail) tagRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    tagCreateUsecase: new TagCreateUsecase(tagRepo),
  };
};

describe('TagCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });

    it('should render a swatch for every colour with gray selected', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect(screen.getAllByRole('radio').length).toBe(8);
      expect(
        screen.getByRole('radio', { name: 'Gray' }).getAttribute('aria-checked')
      ).toBe('true');
    });

    it('should render the highlight switch off by default', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect(
        screen.getByRole('switch').getAttribute('aria-checked')
      ).toBe('false');
    });
  });

  describe('navigation', () => {
    it('should navigate to "/tags" after successful creation', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/tags');
    });

    it('should create tag with the chosen colour and highlight', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();

      render(
        <TagCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagCreateUsecase={new TagCreateUsecase(tagRepo)}
        />
      );

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('radio', { name: 'Green' }));
      await user.click(screen.getByRole('switch'));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(tagRepo.tags.at(-1)).toMatchObject({
        name: 'New Tag',
        color: 'green',
        isHighlighted: true,
      });
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when name field is empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without any user interaction', async () => {
      render(<TagCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps()} />);

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
      const tagRepo = new MockTagRepository();
      jest.spyOn(tagRepo, 'createTag').mockImplementation(
        () => new Promise<void>((resolve) => { resolveCreate = resolve; })
      );

      render(
        <TagCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagCreateUsecase={new TagCreateUsecase(tagRepo)}
        />
      );

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await act(async () => {
        await flushPromises();
      });

      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('spinner')).toBeTruthy();

      await act(async () => {
        resolveCreate();
        await flushPromises();
      });

      expect(screen.queryByTestId('spinner')).toBeNull();
      expect(mockRouterPush).toHaveBeenCalledWith('/tags');
    });

    it('should not disable submit button before any interaction', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Tag Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(<TagCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<TagCreateHandler {...createProps()} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
