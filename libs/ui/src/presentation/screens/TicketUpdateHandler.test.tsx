import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketUpdateHandler } from './TicketUpdateHandler';
import { MockAuthRepository, MockTicketRepository } from '../../data/mock';
import { AuthLogoutUsecase, TicketUpdateUsecase } from '../../domain';
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
    ticketId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const ticketId = options.ticketId ?? 1;
  const ticketRepo = new MockTicketRepository();
  if (options.shouldFail) ticketRepo.setShouldFail(true);

  const preloadedTicket = options.preloaded
    ? ticketRepo.tickets.find((t) => t.id === ticketId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    ticketUpdateUsecase: new TicketUpdateUsecase(ticketRepo, {
      ticketId,
      ticket: preloadedTicket,
    }),
  };
};

describe('TicketUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching ticket', async () => {
      render(<TicketUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Ticket...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after ticket data loads', async () => {
      render(<TicketUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when ticket is preloaded', async () => {
      render(<TicketUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('0xA3F19C82')).toBeTruthy();
      expect(screen.getByDisplayValue('Ticket 01')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when ticket fetch fails', async () => {
      render(<TicketUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Ticket' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/tickets" after successful update', async () => {
      const user = userEvent.setup();
      render(<TicketUpdateHandler {...createProps({ preloaded: true })} />);

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, '0xUPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/tickets');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      const preloadedTicket = ticketRepo.tickets[0];
      const ticketUpdateUsecase = new TicketUpdateUsecase(ticketRepo, {
        ticketId: preloadedTicket.id,
        ticket: preloadedTicket,
      });
      ticketRepo.setShouldFail(true);

      render(
        <TicketUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          ticketUpdateUsecase={ticketUpdateUsecase}
        />
      );

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, '0xUPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<TicketUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when code field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<TicketUpdateHandler {...createProps({ preloaded: true })} />);

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByText('String must contain at least 1 character(s)').length).toBeGreaterThan(0);
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      const preloadedTicket = ticketRepo.tickets[0];
      const ticketUpdateUsecase = new TicketUpdateUsecase(ticketRepo, {
        ticketId: preloadedTicket.id,
        ticket: preloadedTicket,
      });
      ticketRepo.setShouldFail(true);

      render(
        <TicketUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          ticketUpdateUsecase={ticketUpdateUsecase}
        />
      );

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, '0xUPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Ticket Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      const preloadedTicket = ticketRepo.tickets[0];
      const ticketUpdateUsecase = new TicketUpdateUsecase(ticketRepo, {
        ticketId: preloadedTicket.id,
        ticket: preloadedTicket,
      });
      ticketRepo.setShouldFail(true);

      render(
        <TicketUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          ticketUpdateUsecase={ticketUpdateUsecase}
        />
      );

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, '0xUPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<TicketUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch ticket when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const ticketRepo = new MockTicketRepository();
      ticketRepo.setShouldFail(true);

      render(
        <TicketUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          ticketUpdateUsecase={new TicketUpdateUsecase(ticketRepo, {
            ticketId: 1,
            ticket: null,
          })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Ticket' })).toBeTruthy();

      ticketRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
