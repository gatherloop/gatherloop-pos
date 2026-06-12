import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketListHandler } from './TicketListHandler';
import { MockAuthRepository, MockTicketRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  TicketDeleteUsecase,
  TicketListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    ticketRepo?: MockTicketRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const ticketRepo = options.ticketRepo ?? new MockTicketRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    ticketListUsecase: new TicketListUsecase(ticketRepo, { tickets: [] }),
    ticketDeleteUsecase: new TicketDeleteUsecase(ticketRepo),
  };
};

describe('TicketListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<TicketListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show ticket list after successful fetch', async () => {
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Ticket 01' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Ticket 02' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const ticketRepo = new MockTicketRepository();
      ticketRepo.setShouldFail(true);

      render(<TicketListHandler {...createProps({ ticketRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tickets' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect(screen.queryByTestId('skeleton-list')).toBeNull();

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no tickets exist', async () => {
      const ticketRepo = new MockTicketRepository();
      ticketRepo.tickets = [];

      render(<TicketListHandler {...createProps({ ticketRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Ticket is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const ticketRepo = new MockTicketRepository();
      ticketRepo.tickets = [];
      render(<TicketListHandler {...createProps({ ticketRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      ticketRepo.tickets = [];
      render(<TicketListHandler {...createProps({ ticketRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      await user.click(screen.getByRole('button', { name: 'Create Ticket' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/tickets/create');
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Ticket ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Ticket ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Ticket ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Ticket ?' })).toBeNull();
    });

    it('should refetch ticket list after successful delete', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      render(<TicketListHandler {...createProps({ ticketRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Ticket 01' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Ticket ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Ticket ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Ticket 02' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to ticket edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/tickets/1');
    });

    it('should navigate to ticket page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<TicketListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Ticket 01' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/tickets/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch tickets when retry button is pressed', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      ticketRepo.setShouldFail(true);

      render(<TicketListHandler {...createProps({ ticketRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tickets' })).toBeTruthy();

      ticketRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Ticket 01' })).toBeTruthy();
    });
  });
});
