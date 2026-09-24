import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { SegmentedControl, SegmentedControlProps } from './SegmentedControl';

type FormValues = { diningOption: 'dine_in' | 'takeaway' };

const diningOptionItems = [
  { label: 'Dine In', value: 'dine_in' as const },
  { label: 'Takeaway', value: 'takeaway' as const },
];

const SegmentedControlWrapper = (
  props: Partial<SegmentedControlProps<'dine_in' | 'takeaway'>> & {
    initialValue?: 'dine_in' | 'takeaway';
  }
) => {
  const { initialValue = 'dine_in', items = diningOptionItems, ...rest } = props;
  const form = useForm<FormValues>({
    defaultValues: { diningOption: initialValue },
  });
  return (
    <FormProvider {...form}>
      <SegmentedControl name="diningOption" items={items} {...rest} />
    </FormProvider>
  );
};

describe('SegmentedControl', () => {
  it('renders one radio per item inside a radiogroup', () => {
    render(<SegmentedControlWrapper />);

    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Dine In' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Takeaway' })).toBeTruthy();
  });

  it('marks the item matching the field value as checked, and the other as unchecked', () => {
    render(<SegmentedControlWrapper initialValue="dine_in" />);

    expect(
      screen.getByRole('radio', { name: 'Dine In' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(
      screen.getByRole('radio', { name: 'Takeaway' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('switches the checked item when a different segment is pressed', async () => {
    const user = userEvent.setup();
    render(<SegmentedControlWrapper initialValue="dine_in" />);

    await user.click(screen.getByRole('radio', { name: 'Takeaway' }));

    expect(
      screen.getByRole('radio', { name: 'Takeaway' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(
      screen.getByRole('radio', { name: 'Dine In' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('calls onValueChange with the newly selected value', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    render(
      <SegmentedControlWrapper
        initialValue="dine_in"
        onValueChange={onValueChange}
      />
    );

    await user.click(screen.getByRole('radio', { name: 'Takeaway' }));

    expect(onValueChange).toHaveBeenCalledWith('takeaway');
  });
});
