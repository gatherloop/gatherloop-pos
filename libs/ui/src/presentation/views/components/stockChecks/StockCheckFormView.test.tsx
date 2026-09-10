import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMedia } from 'tamagui';
import { StockCheckForm } from '../../../../domain';
import {
  StockCheckFormView,
  StockCheckFormViewProps,
} from './StockCheckFormView';

const items: StockCheckForm['items'] = [
  {
    materialId: 1,
    materialName: 'Botol Kaca Bening 250 ml',
    purchaseUnit: 'Dus (24 Pcs)',
    currentStock: 12,
  },
  {
    materialId: 2,
    materialName: 'Baking Soda',
    purchaseUnit: 'PCS (15 Gram)',
    currentStock: null,
  },
];

const filledItems: StockCheckForm['items'] = items.map((item) => ({
  ...item,
  currentStock: item.currentStock ?? 1,
}));

const baseProps: StockCheckFormViewProps = {
  variant: { type: 'loaded' },
  defaultValues: { items },
  onSubmit: jest.fn(),
  isSubmitDisabled: false,
  isSubmitting: false,
};

const getSearchInput = () =>
  screen.getByPlaceholderText(
    'Search material by name'
  ) as HTMLInputElement;

describe('StockCheckFormView', () => {
  afterEach(() => {
    jest.clearAllMocks();
    (useMedia as jest.Mock).mockReturnValue({});
  });

  it('shows the loading view while fetching', () => {
    render(<StockCheckFormView {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Stock Check...')).toBeTruthy();
  });

  it('shows the error view with a retry button', async () => {
    const user = userEvent.setup();
    const onRetryButtonPress = jest.fn();
    render(
      <StockCheckFormView
        {...baseProps}
        variant={{ type: 'error', onRetryButtonPress }}
      />
    );

    expect(screen.getByText('Failed to Fetch Stock Check')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryButtonPress).toHaveBeenCalled();
  });

  describe.each([
    ['desktop layout (media.sm undefined)', {}],
    ['compact layout (media.sm true)', { sm: true }],
  ])('%s', (_, media) => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue(media);
    });

    it('renders the pinned header: search input, filter button and the filled/total counter', () => {
      render(<StockCheckFormView {...baseProps} />);

      expect(
        screen.getByPlaceholderText('Search material by name')
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /show only pending/i })
      ).toBeTruthy();
      expect(screen.getByText('1 / 2 materials checked')).toBeTruthy();
    });

    it('does not render the clear-search button before any search is entered', () => {
      render(<StockCheckFormView {...baseProps} />);

      expect(
        screen.queryByRole('button', { name: /clear search/i })
      ).toBeNull();
    });

    it('renders the clear-search button once a query is entered, and clearing it empties the search box', async () => {
      const user = userEvent.setup();
      render(<StockCheckFormView {...baseProps} />);

      await user.type(getSearchInput(), 'Botol');

      const clearButton = await screen.findByRole(
        'button',
        { name: /clear search/i },
        { timeout: 1000 }
      );
      await user.click(clearButton);

      await waitFor(() => expect(getSearchInput().value).toBe(''));
    });

    it('toggles the pending filter when the filter button is pressed', async () => {
      const user = userEvent.setup();
      render(<StockCheckFormView {...baseProps} />);

      const filterButton = screen.getByRole('button', {
        name: 'Show only pending',
      });
      await user.click(filterButton);

      expect(
        screen.getByRole('button', { name: 'Show all materials' })
      ).toBeTruthy();
    });

    it('renders every material row', () => {
      render(<StockCheckFormView {...baseProps} />);

      expect(screen.getByText('Botol Kaca Bening 250 ml')).toBeTruthy();
      expect(screen.getByText('Baking Soda')).toBeTruthy();
    });

    it('shows the server error banner', () => {
      render(
        <StockCheckFormView
          {...baseProps}
          serverError="Something went wrong"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('submits the form via the Submit button', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(
        <StockCheckFormView
          {...baseProps}
          defaultValues={{ items: filledItems }}
          onSubmit={onSubmit}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit).toHaveBeenCalled();
    });

    it('renders exactly one Submit button', () => {
      render(<StockCheckFormView {...baseProps} />);

      expect(screen.getAllByRole('button', { name: 'Submit' })).toHaveLength(1);
    });

    it('clears the search, enables the pending filter and focuses the first pending row on submit', async () => {
      const user = userEvent.setup();
      render(<StockCheckFormView {...baseProps} />);

      await user.type(getSearchInput(), 'Botol');
      await screen.findByRole(
        'button',
        { name: /clear search/i },
        { timeout: 1000 }
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(getSearchInput().value).toBe(''));
      expect(
        screen.getByRole('button', { name: 'Show all materials' })
      ).toBeTruthy();

      const pendingInput = screen.getAllByRole('textbox')[2];
      await waitFor(() => expect(document.activeElement).toBe(pendingInput));
    });
  });

  it('reads the fetched item count in the progress counter once loading transitions to loaded', () => {
    const { rerender } = render(
      <StockCheckFormView
        {...baseProps}
        defaultValues={{ items: [] }}
        variant={{ type: 'loading' }}
      />
    );

    rerender(<StockCheckFormView {...baseProps} variant={{ type: 'loaded' }} />);

    expect(screen.getByText('1 / 2 materials checked')).toBeTruthy();
  });
});
