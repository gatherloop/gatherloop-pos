import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { RentalCheckinCartView } from './RentalCheckinCartView';
import type { RentalCheckinForm } from '../../../domain';
import { mockTickets, mockVariant } from '../../../../.storybook/mocks/mockData';

const Wrapper = ({
  defaultValues,
  serverError,
}: {
  defaultValues: RentalCheckinForm;
  serverError?: string;
}) => {
  const form = useForm<RentalCheckinForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <FormProvider {...form}>
      <RentalCheckinCartView
        form={form}
        rentalsFieldArray={rentalsFieldArray}
        tickets={mockTickets}
        onToggleCustomizeCheckinDateTime={jest.fn()}
        serverError={serverError}
      />
    </FormProvider>
  );
};

const threeRentals: RentalCheckinForm = {
  name: '',
  checkinAt: null,
  rentals: [
    { code: '', variant: mockVariant },
    { code: '', variant: mockVariant },
    { code: '', variant: mockVariant },
  ],
};

describe('RentalCheckinCartView', () => {
  beforeEach(() => {
    // jsdom does not implement `scrollIntoView`; the component calls it
    // optionally, so stub it to assert it was invoked (PRD Phase 4,
    // "Code-entry ergonomics in the sheet").
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders Customer Name, the datetime checkbox and one Code input per rental', () => {
    render(<Wrapper defaultValues={threeRentals} />);

    expect(screen.getByRole('textbox', { name: 'Customer Name' })).toBeTruthy();
    expect(screen.getByText('Customize Checkin Date Time')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Code')).toHaveLength(3);
  });

  it('advances focus to the next Code input on submit-editing', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    const codeInputs = screen.getAllByPlaceholderText('Code');

    codeInputs[0].focus();
    expect(document.activeElement).toBe(codeInputs[0]);

    await user.type(codeInputs[0], 'CODE1{enter}');
    expect(document.activeElement).toBe(codeInputs[1]);

    await user.type(codeInputs[1], 'CODE2{enter}');
    expect(document.activeElement).toBe(codeInputs[2]);
  });

  it('does not move focus past the last Code input on submit-editing', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    const codeInputs = screen.getAllByPlaceholderText('Code');
    codeInputs[2].focus();

    await user.type(codeInputs[2], 'CODE3{enter}');
    expect(document.activeElement).toBe(codeInputs[2]);
  });

  it('scrolls a Code input into view when it receives focus, whether tapped directly or reached via the chain', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    const codeInputs = screen.getAllByPlaceholderText('Code');

    codeInputs[0].focus();
    expect(codeInputs[0].scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    (codeInputs[1].scrollIntoView as jest.Mock).mockClear();
    await user.type(codeInputs[0], 'CODE1{enter}');
    expect(document.activeElement).toBe(codeInputs[1]);
    expect(codeInputs[1].scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('shows the resolved ticket name for a registered code', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    const codeInputs = screen.getAllByPlaceholderText('Code');
    await user.type(codeInputs[0], mockTickets[0].code);

    expect(screen.getByText(`→ ${mockTickets[0].name}`)).toBeTruthy();
  });

  it('shows an unregistered card hint for an unknown code', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    const codeInputs = screen.getAllByPlaceholderText('Code');
    await user.type(codeInputs[0], 'UNKNOWNCODE');

    expect(screen.getByText('Unregistered card')).toBeTruthy();
  });

  it('removes a rental row when its trash button is pressed', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={threeRentals} />);

    expect(screen.getAllByPlaceholderText('Code')).toHaveLength(3);

    const removeButtons = screen.getAllByRole('button');
    await user.click(removeButtons[0]);

    expect(screen.getAllByPlaceholderText('Code')).toHaveLength(2);
  });

  it('shows the server error banner when serverError is set', () => {
    render(
      <Wrapper
        defaultValues={threeRentals}
        serverError="Failed to submit. Please try again."
      />
    );

    expect(
      screen.getByText('Failed to submit. Please try again.')
    ).toBeTruthy();
  });

  it('does not show the server error banner when serverError is unset', () => {
    render(<Wrapper defaultValues={threeRentals} />);

    expect(
      screen.queryByText('Failed to submit. Please try again.')
    ).toBeNull();
  });
});
