import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { InputNumber, InputNumberProps } from './InputNumber';

type FormValues = { quantity: number | null };

const InputNumberWrapper = (
  props: InputNumberProps & { initialValue?: number | null }
) => {
  const { initialValue = 0, ...inputNumberProps } = props;
  const form = useForm<FormValues>({
    defaultValues: { quantity: initialValue },
  });
  return (
    <FormProvider {...form}>
      <InputNumber name="quantity" {...inputNumberProps} />
    </FormProvider>
  );
};

const getInput = () => screen.getByRole('textbox') as HTMLInputElement;

describe('InputNumber', () => {
  it('increments and decrements by step, honouring min/max', async () => {
    const user = userEvent.setup();
    render(<InputNumberWrapper initialValue={5} min={0} max={6} step={1} />);

    const [minus, plus] = screen.getAllByRole('button');

    await user.click(plus);
    expect(getInput().value).toBe('6');

    // clamped at max
    await user.click(plus);
    expect(getInput().value).toBe('6');

    await user.click(minus);
    await user.click(minus);
    await user.click(minus);
    await user.click(minus);
    await user.click(minus);
    await user.click(minus);
    // clamped at min
    expect(getInput().value).toBe('0');
  });

  describe('inputMode defaults derived from fractionDigit (PRD FR-3)', () => {
    it('defaults to a numeric keypad for whole numbers (fractionDigit 0)', () => {
      render(<InputNumberWrapper initialValue={0} fractionDigit={0} />);
      expect(getInput().getAttribute('inputmode')).toBe('numeric');
    });

    it('defaults to a decimal keypad when fractionDigit is greater than 0', () => {
      render(<InputNumberWrapper initialValue={0} fractionDigit={2} />);
      expect(getInput().getAttribute('inputmode')).toBe('decimal');
    });

    it('lets a caller override the derived inputMode', () => {
      render(
        <InputNumberWrapper
          initialValue={0}
          fractionDigit={2}
          inputMode="numeric"
        />
      );
      expect(getInput().getAttribute('inputmode')).toBe('numeric');
    });
  });
});
