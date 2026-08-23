import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { useMedia } from 'tamagui';
import { StockCheckForm } from '../../../domain';
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

type WrapperProps = Omit<
  StockCheckFormViewProps,
  'form' | 'onSubmit' | 'filled' | 'total' | 'pendingRows'
> & { onSubmit?: StockCheckFormViewProps['onSubmit'] };

const StockCheckFormViewWrapper = (props: WrapperProps) => {
  const form = useForm<StockCheckForm>({ defaultValues: { items } });
  const pendingRows = items.map((item) => item.currentStock === null);
  const filled = pendingRows.filter((isPending) => !isPending).length;

  return (
    <StockCheckFormView
      {...props}
      form={form}
      onSubmit={props.onSubmit ?? jest.fn()}
      filled={filled}
      total={items.length}
      pendingRows={pendingRows}
    />
  );
};

const baseProps: WrapperProps = {
  isSubmitDisabled: false,
  isSubmitting: false,
  query: '',
  onQueryChange: jest.fn(),
  showOnlyPending: false,
  onShowOnlyPendingToggle: jest.fn(),
};

describe('StockCheckFormView', () => {
  afterEach(() => {
    jest.clearAllMocks();
    (useMedia as jest.Mock).mockReturnValue({});
  });

  describe.each([
    ['desktop layout (media.sm undefined)', {}],
    ['compact layout (media.sm true)', { sm: true }],
  ])('%s', (_, media) => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue(media);
    });

    it('renders the pinned header: search input, filter button and the filled/total counter', () => {
      render(<StockCheckFormViewWrapper {...baseProps} />);

      expect(
        screen.getByPlaceholderText('Search material by name')
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /show only pending/i })
      ).toBeTruthy();
      expect(screen.getByText('1 / 2 materials checked')).toBeTruthy();
    });

    it('does not render the clear-search button when the query is empty', () => {
      render(<StockCheckFormViewWrapper {...baseProps} query="" />);

      expect(
        screen.queryByRole('button', { name: /clear search/i })
      ).toBeNull();
    });

    it('renders the clear-search button once a query is entered, and clearing it calls onQueryChange', async () => {
      const user = userEvent.setup();
      const onQueryChange = jest.fn();
      render(
        <StockCheckFormViewWrapper
          {...baseProps}
          query="Botol"
          onQueryChange={onQueryChange}
        />
      );

      const clearButton = screen.getByRole('button', {
        name: /clear search/i,
      });
      await user.click(clearButton);

      expect(onQueryChange).toHaveBeenCalledWith('');
    });

    it('toggles the pending filter when the filter button is pressed', async () => {
      const user = userEvent.setup();
      const onShowOnlyPendingToggle = jest.fn();
      render(
        <StockCheckFormViewWrapper
          {...baseProps}
          onShowOnlyPendingToggle={onShowOnlyPendingToggle}
        />
      );

      await user.click(
        screen.getByRole('button', { name: /show only pending/i })
      );

      expect(onShowOnlyPendingToggle).toHaveBeenCalled();
    });

    it('renders every material row', () => {
      render(<StockCheckFormViewWrapper {...baseProps} />);

      expect(screen.getByText('Botol Kaca Bening 250 ml')).toBeTruthy();
      expect(screen.getByText('Baking Soda')).toBeTruthy();
    });

    it('shows the server error banner', () => {
      render(
        <StockCheckFormViewWrapper
          {...baseProps}
          serverError="Something went wrong"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('submits the form via the Submit button', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<StockCheckFormViewWrapper {...baseProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit).toHaveBeenCalled();
    });

    // PRD FR-5: on compact, Submit moves into a pinned bottom bar instead of
    // trailing the list; desktop keeps the single inline button. Either way
    // there is exactly one — never both at once.
    it('renders exactly one Submit button', () => {
      render(<StockCheckFormViewWrapper {...baseProps} />);

      expect(screen.getAllByRole('button', { name: 'Submit' })).toHaveLength(1);
    });

    // PRD FR-6: submitting with pending rows clears the search, enables the
    // pending filter, and focuses the first pending row's input — via a ref
    // `InputNumber` forwards, replacing the old DOM-only
    // `querySelector('input')` so this also works on React Native.
    it('clears the search, enables the pending filter and focuses the first pending row on submit', async () => {
      const user = userEvent.setup();
      const onQueryChange = jest.fn();
      const onShowOnlyPendingToggle = jest.fn();
      render(
        <StockCheckFormViewWrapper
          {...baseProps}
          query="Botol"
          onQueryChange={onQueryChange}
          onShowOnlyPendingToggle={onShowOnlyPendingToggle}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onQueryChange).toHaveBeenCalledWith('');
      expect(onShowOnlyPendingToggle).toHaveBeenCalled();

      // Index 0 is the search box; items[1] ('Baking Soda') is the only
      // pending row in the fixture, so its input is index 2.
      const pendingInput = screen.getAllByRole('textbox')[2];
      await waitFor(() => expect(document.activeElement).toBe(pendingInput));
    });
  });
});
