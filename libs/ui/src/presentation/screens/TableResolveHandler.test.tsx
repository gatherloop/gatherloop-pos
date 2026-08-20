import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableResolveHandler } from './TableResolveHandler';
import {
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../data/mock';
import { TableResolveUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const createProps = (
  options: { code?: string | null; shouldFail?: boolean } = {}
) => {
  const code = options.code === undefined ? null : options.code;
  const repository = new MockPublicTableRepository();
  if (options.shouldFail) repository.setShouldFail(true);
  const sessionRepository = new MockSessionRepository();

  return {
    repository,
    sessionRepository,
    tableResolveUsecase: new TableResolveUsecase(repository, { code }),
  };
};

describe('TableResolveHandler', () => {
  it('shows the "scan the QR" screen when there is no code', async () => {
    render(<TableResolveHandler {...createProps({ code: null })} />);

    expect(screen.getByText('Pindai QR di meja Anda')).toBeTruthy();
    await act(async () => {
      await flushPromises();
    });
  });

  it('shows a loading state while resolving a code', async () => {
    render(<TableResolveHandler {...createProps({ code: '3F7H9K2M5P' })} />);

    expect(screen.getByText('Memuat meja...')).toBeTruthy();
    await act(async () => {
      await flushPromises();
    });
  });

  it('renders children with the resolved table label once resolved', async () => {
    const props = createProps({ code: '3F7H9K2M5P' });
    render(
      <TableResolveHandler {...props}>
        <div>Menu placeholder</div>
      </TableResolveHandler>
    );

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Meja 01')).toBeTruthy();
    expect(screen.getByText('Menu placeholder')).toBeTruthy();
  });

  it("renders the table's floor number next to the label", async () => {
    const props = createProps({ code: '3F7H9K2M5P' });
    render(<TableResolveHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText(/Lantai 1/)).toBeTruthy();
  });

  it('shows a different floor for a table on floor 2', async () => {
    const props = createProps({ code: '8A2C4E6G8J' });
    render(<TableResolveHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Meja 02')).toBeTruthy();
    expect(screen.getByText(/Lantai 2/)).toBeTruthy();
  });

  it('persists the table code on the session once resolved', async () => {
    const props = createProps({ code: '3F7H9K2M5P' });
    render(<TableResolveHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(props.sessionRepository.getTableCode()).toBe('3F7H9K2M5P');
  });

  it('shows the invalid QR screen for an unknown code', async () => {
    const props = createProps({ code: 'UNKNOWNCODE' });
    render(<TableResolveHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('QR tidak valid')).toBeTruthy();
    expect(props.sessionRepository.getTableCode()).toBeNull();
  });

  it('shows a retryable error screen on a network failure, and recovers on retry', async () => {
    const user = userEvent.setup();
    const props = createProps({ code: '3F7H9K2M5P', shouldFail: true });
    render(<TableResolveHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Gagal memuat meja')).toBeTruthy();

    props.repository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Coba Lagi' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Meja 01')).toBeTruthy();
  });
});
