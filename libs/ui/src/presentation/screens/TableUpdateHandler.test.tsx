import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableUpdateHandler } from './TableUpdateHandler';
import { MockAuthRepository, MockTableRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  TableRegenerateCodeUsecase,
  TableUpdateUsecase,
} from '../../domain';
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
    tableId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const tableId = options.tableId ?? 1;
  const tableRepo = new MockTableRepository();
  if (options.shouldFail) tableRepo.setShouldFail(true);

  const preloadedTable = options.preloaded
    ? tableRepo.tables.find((t) => t.id === tableId) ?? null
    : null;

  return {
    tableRepo,
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    tableUpdateUsecase: new TableUpdateUsecase(tableRepo, {
      tableId,
      table: preloadedTable,
    }),
    tableRegenerateCodeUsecase: new TableRegenerateCodeUsecase(tableRepo),
  };
};

describe('TableUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching table', async () => {
      render(<TableUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Table...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after table data loads', async () => {
      render(<TableUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when table is preloaded', async () => {
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Meja 01')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should fill the form with fetched values when data loads after mount', async () => {
      render(<TableUpdateHandler {...createProps({ preloaded: false })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByDisplayValue('Meja 01')).toBeTruthy();
    });

    it('should show error state when table fetch fails', async () => {
      render(<TableUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Table' })).toBeTruthy();
    });

    it('should render the QR code once the table is loaded', async () => {
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByTestId('table-qr-code')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to "/tables" after successful update', async () => {
      const user = userEvent.setup();
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);

      const labelInput = screen.getByRole('textbox', { name: 'Label' });
      await user.clear(labelInput);
      await user.type(labelInput, 'Meja Baru');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/tables');
    });
  });

  describe('regenerate code', () => {
    it('should not show the regenerate confirmation initially', async () => {
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByRole('heading', { name: 'Regenerate QR Code ?' })).toBeNull();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the regenerate confirmation when the button is pressed', async () => {
      const user = userEvent.setup();
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Regenerate Code' }));

      expect(screen.getByRole('heading', { name: 'Regenerate QR Code ?' })).toBeTruthy();
    });

    it('should refetch the table with a new code after confirming regeneration', async () => {
      const user = userEvent.setup();
      const props = createProps({ preloaded: true });
      const originalCode = props.tableRepo.tables[0].code;

      render(<TableUpdateHandler {...props} />);

      await user.click(screen.getByRole('button', { name: 'Regenerate Code' }));
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });
      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText(originalCode)).toBeNull();
    });

    it('should hide the confirmation when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<TableUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Regenerate Code' }));
      expect(screen.getByRole('heading', { name: 'Regenerate QR Code ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Regenerate QR Code ?' })).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch table when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const props = createProps({ shouldFail: true });

      render(<TableUpdateHandler {...props} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Table' })).toBeTruthy();

      props.tableRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
