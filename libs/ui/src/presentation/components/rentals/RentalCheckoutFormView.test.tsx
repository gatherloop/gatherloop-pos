import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMedia, Text } from 'tamagui';
import { RentalCheckoutFormView } from './RentalCheckoutFormView';
import type { RentalCheckoutForm } from '../../../domain';
import { mockRental, mockRentalCheckedOut } from '../../../../.storybook/mocks/mockData';

const emptyValues: RentalCheckoutForm = {
  rentals: [],
};

const oneRentalValues: RentalCheckoutForm = {
  rentals: [mockRental],
};

const twoRentalValues: RentalCheckoutForm = {
  rentals: [mockRental, mockRentalCheckedOut],
};

const Wrapper = ({
  defaultValues,
  serverError,
  isSubmitSuccess = false,
}: {
  defaultValues: RentalCheckoutForm;
  serverError?: string;
  isSubmitSuccess?: boolean;
}) => {
  const form = useForm<RentalCheckoutForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });

  return (
    <RentalCheckoutFormView
      form={form}
      onSubmit={jest.fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={isSubmitSuccess}
      RentalItemSelect={() => <Text color="$color">Rental Picker</Text>}
      rentalsFieldArray={rentalsFieldArray}
      serverError={serverError}
    />
  );
};

describe('RentalCheckoutFormView', () => {
  // mockRental/mockRentalCheckedOut both check in on 2024-01-20 — always far
  // more than their last pricing tier's 120-minute cap by the time this
  // suite runs — so both consistently price at the last tier (Rp 30.000)
  // regardless of the real clock, with no need to fake `now`.
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  describe('desktop layout (media.sm undefined)', () => {
    it('renders the picker, cart body and Submit inline with no cart button', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Rental Picker')).toBeTruthy();
      expect(screen.getByText('Items')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });
  });

  describe('compact layout (media.sm true)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    it('shows only the rental picker when the cart is empty, with no cart button', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Rental Picker')).toBeTruthy();
      expect(screen.queryByText('Items')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });

    it('shows the cart button with the item count and total once a rental is added', () => {
      render(<Wrapper defaultValues={oneRentalValues} />);

      expect(screen.getByText(/1 item · Rp 30.000 · View Cart/)).toBeTruthy();
    });

    it('shows a pluralized summary and combined total for multiple rentals', () => {
      render(<Wrapper defaultValues={twoRentalValues} />);

      expect(
        screen.getByText(/2 items · Rp 60.000 · View Cart/)
      ).toBeTruthy();
    });

    it('opens the cart sheet with every rental row, Grand Total and Submit when the button is pressed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={twoRentalValues} />);

      await user.click(screen.getByText(/View Cart/));

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Grand Total')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('closes the cart sheet via the close control, keeping the cart intact', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={oneRentalValues} />);

      await user.click(screen.getByText(/View Cart/));
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Close Cart' }));
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();

      await user.click(screen.getByText(/View Cart/));
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('updates both the button label and the sheet footer total when a row is removed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={twoRentalValues} />);

      await user.click(screen.getByText(/View Cart/));
      const [removeButton] = screen.getAllByRole('button', { name: '' });
      await user.click(removeButton);

      expect(screen.getByText(/1 item · Rp 30.000 · View Cart/)).toBeTruthy();
    });

    it('closes the sheet automatically once the last rental is removed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={oneRentalValues} />);

      await user.click(screen.getByText(/View Cart/));
      const [removeButton] = screen.getAllByRole('button', { name: '' });
      await user.click(removeButton);

      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });

    it('renders the server error banner inside the open sheet', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper
          defaultValues={oneRentalValues}
          serverError="Failed to submit. Please try again."
        />
      );

      await user.click(screen.getByText(/View Cart/));

      expect(
        screen.getByText('Failed to submit. Please try again.')
      ).toBeTruthy();
    });

    describe('close-on-success (PRD FR-3)', () => {
      it('closes the cart sheet once isSubmitSuccess flips to true', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
          <Wrapper defaultValues={oneRentalValues} isSubmitSuccess={false} />
        );

        await user.click(screen.getByText(/View Cart/));
        expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

        rerender(
          <Wrapper defaultValues={oneRentalValues} isSubmitSuccess={true} />
        );

        expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
        expect(
          screen.queryByRole('button', { name: 'Close Cart' })
        ).toBeNull();
      });

      it('does not open the sheet on its own when isSubmitSuccess is already true on mount', () => {
        render(
          <Wrapper defaultValues={oneRentalValues} isSubmitSuccess={true} />
        );

        expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
        expect(screen.getByText(/View Cart/)).toBeTruthy();
      });
    });
  });
});
