import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { useMedia } from 'tamagui';
import { StockCheckItemRow, StockCheckItemRowProps } from './StockCheckItemRow';

type FormValues = { currentStock: number | null };

const StockCheckItemRowWrapper = ({
  currentStock,
  ...rowProps
}: Omit<StockCheckItemRowProps, 'fieldName'> & {
  currentStock: number | null;
}) => {
  const form = useForm<FormValues>({ defaultValues: { currentStock } });
  return (
    <FormProvider {...form}>
      <StockCheckItemRow {...rowProps} fieldName="currentStock" />
    </FormProvider>
  );
};

const baseProps: Omit<StockCheckItemRowProps, 'fieldName'> & {
  currentStock: number | null;
} = {
  materialName: 'Botol Kaca Bening 250 ml',
  purchaseUnit: 'Dus (24 Pcs)',
  inputId: 'stock-check-item-1',
  isPending: false,
  isErrorRow: false,
  hidden: false,
  currentStock: 12,
};

const getInput = () => screen.getByRole('textbox') as HTMLInputElement;

describe('StockCheckItemRow', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  describe.each([
    ['desktop layout (media.sm undefined)', {}],
    ['compact layout (media.sm true)', { sm: true }],
  ])('%s', (_, media) => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue(media);
    });

    it('renders the material name, the stock input and the purchase unit', () => {
      render(<StockCheckItemRowWrapper {...baseProps} />);

      expect(screen.getByText(baseProps.materialName)).toBeTruthy();
      expect(screen.getByRole('textbox')).toBeTruthy();
      expect(screen.getByText(baseProps.purchaseUnit)).toBeTruthy();
    });

    it('shows the current stock value in the input', () => {
      render(<StockCheckItemRowWrapper {...baseProps} currentStock={12} />);

      expect(getInput().value).toBe('12');
    });

    it('shows a placeholder, not 0, when currentStock is null', () => {
      render(<StockCheckItemRowWrapper {...baseProps} currentStock={null} />);

      expect(getInput().value).toBe('');
    });

    it('does not render the Pending badge when isPending is false', () => {
      render(<StockCheckItemRowWrapper {...baseProps} isPending={false} />);
      expect(screen.queryByText('Pending')).toBeNull();
    });

    it('shows the Pending badge when isPending is true', () => {
      render(<StockCheckItemRowWrapper {...baseProps} isPending={true} />);
      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('shows the inline validation error only when isErrorRow is true', () => {
      render(<StockCheckItemRowWrapper {...baseProps} isErrorRow={false} />);
      expect(
        screen.queryByText('Please enter the current stock')
      ).toBeNull();
    });

    it('shows the inline validation error when isErrorRow is true', () => {
      render(
        <StockCheckItemRowWrapper
          {...baseProps}
          isPending={true}
          isErrorRow={true}
          currentStock={null}
        />
      );
      expect(
        screen.getByText('Please enter the current stock')
      ).toBeTruthy();
    });

    it('increments the value when the + stepper is pressed', async () => {
      const user = userEvent.setup();
      render(<StockCheckItemRowWrapper {...baseProps} currentStock={12} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      expect(getInput().value).toBe('13');
    });

    it('decrements the value when the - stepper is pressed', async () => {
      const user = userEvent.setup();
      render(<StockCheckItemRowWrapper {...baseProps} currentStock={12} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(getInput().value).toBe('11');
    });
  });
});
