import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagUpdateHandler } from './TagUpdateHandler';
import { MockAuthRepository, MockTagRepository } from '../../../data/mock';
import { AuthLogoutUsecase, TagUpdateUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: {
  tagId?: number;
  shouldFail?: boolean;
  preloaded?: boolean;
} = {}) => {
  const tagId = options.tagId ?? 1;
  const tagRepo = new MockTagRepository();
  if (options.shouldFail) tagRepo.setShouldFail(true);

  const preloadedTag = options.preloaded
    ? tagRepo.tags.find((c) => c.id === tagId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    tagUpdateUsecase: new TagUpdateUsecase(tagRepo, {
      tagId,
      tag: preloadedTag,
    }),
  };
};

describe('TagUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await flushPromises();
    });
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching tag', async () => {
      render(<TagUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Tag...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after tag data loads', async () => {
      render(<TagUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when tag is preloaded', async () => {
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('New')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should fill the form with fetched values when data loads after mount', async () => {
      render(<TagUpdateHandler {...createProps({ preloaded: false })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByDisplayValue('New')).toBeTruthy();
    });

    it('should render the current colour and highlight values', async () => {
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);
      expect(
        screen.getByRole('radio', { name: 'Green' }).getAttribute('aria-checked')
      ).toBe('true');
      expect(
        screen.getByRole('switch').getAttribute('aria-checked')
      ).toBe('true');
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when tag fetch fails', async () => {
      render(<TagUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tag' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/tags" after successful update', async () => {
      const user = userEvent.setup();
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/tags');
    });

    it('should update tag with the chosen colour and highlight', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      const preloadedTag = tagRepo.tags[0];

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={new TagUpdateUsecase(tagRepo, {
            tagId: preloadedTag.id,
            tag: preloadedTag,
          })}
        />
      );

      await user.click(screen.getByRole('radio', { name: 'Purple' }));
      await user.click(screen.getByRole('switch'));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(
        tagRepo.tags.find((c) => c.id === preloadedTag.id)
      ).toMatchObject({ color: 'purple', isHighlighted: false });
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      const preloadedTag = tagRepo.tags[0];
      const tagUpdateUsecase = new TagUpdateUsecase(tagRepo, {
        tagId: preloadedTag.id,
        tag: preloadedTag,
      });
      tagRepo.setShouldFail(true);

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={tagUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('loading states', () => {
    it('should disable submit button and show spinner while updating', async () => {
      const user = userEvent.setup();
      let resolveUpdate!: () => void;
      const tagRepo = new MockTagRepository();
      jest.spyOn(tagRepo, 'updateTag').mockImplementation(
        () => new Promise<void>((resolve) => { resolveUpdate = resolve; })
      );
      const preloadedTag = tagRepo.tags[0];

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={new TagUpdateUsecase(tagRepo, {
            tagId: preloadedTag.id,
            tag: preloadedTag,
          })}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('spinner')).toBeTruthy();

      await act(async () => {
        resolveUpdate();
        await flushPromises();
      });

      expect(screen.queryByTestId('spinner')).toBeNull();
      expect(mockRouterPush).toHaveBeenCalledWith('/tags');
    });

    it('should not disable submit button when form is loaded', async () => {
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      const preloadedTag = tagRepo.tags[0];
      const tagUpdateUsecase = new TagUpdateUsecase(tagRepo, {
        tagId: preloadedTag.id,
        tag: preloadedTag,
      });
      tagRepo.setShouldFail(true);

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={tagUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Tag Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      const preloadedTag = tagRepo.tags[0];
      const tagUpdateUsecase = new TagUpdateUsecase(tagRepo, {
        tagId: preloadedTag.id,
        tag: preloadedTag,
      });
      tagRepo.setShouldFail(true);

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={tagUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tag');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<TagUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch tag when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const tagRepo = new MockTagRepository();
      tagRepo.setShouldFail(true);

      render(
        <TagUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          tagUpdateUsecase={new TagUpdateUsecase(tagRepo, {
            tagId: 1,
            tag: null,
          })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tag' })).toBeTruthy();

      tagRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
