import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketCreateHandler } from './TicketCreateHandler';
import { MockAuthRepository, MockTicketRepository } from '../../data/mock';
import { AuthLogoutUsecase, TicketCreateUsecase } from '../../domain';
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
  const ticketRepo = new MockTicketRepository();
  if (options.shouldFail) ticketRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    ticketCreateUsecase: new TicketCreateUsecase(ticketRepo),
  };
};

describe('TicketCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<TicketCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the code and name input fields', () => {
      render(<TicketCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/tickets" after successful creation', async () => {
      const user = userEvent.setup();
      render(<TicketCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), '0xNEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ticket 03');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/tickets');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<TicketCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), '0xNEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ticket 03');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when fields are empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<TicketCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when code field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<TicketCreateHandler {...createProps()} />);

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
      render(<TicketCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), '0xNEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ticket 03');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Ticket Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(<TicketCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), '0xNEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ticket 03');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<TicketCreateHandler {...createProps()} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
