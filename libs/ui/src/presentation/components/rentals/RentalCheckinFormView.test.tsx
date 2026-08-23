import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMedia, Text } from 'tamagui';
import { RentalCheckinFormView } from './RentalCheckinFormView';
import type { RentalCheckinForm } from '../../../domain';
import { mockTickets, mockVariant } from '../../../../.storybook/mocks/mockData';

const emptyValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const oneRentalValues: RentalCheckinForm = {
  name: '',
  rentals: [{ code: '', variant: mockVariant }],
  checkinAt: null,
};

const threeRentalsValues: RentalCheckinForm = {
  name: '',
  rentals: [
    { code: '', variant: mockVariant },
    { code: '', variant: mockVariant },
    { code: '', variant: mockVariant },
  ],
  checkinAt: null,
};

const Wrapper = ({
  defaultValues,
  isSubmitSuccess = false,
}: {
  defaultValues: RentalCheckinForm;
  isSubmitSuccess?: boolean;
}) => {
  const form = useForm<RentalCheckinForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });

  return (
    <RentalCheckinFormView
      form={form}
      onToggleCustomizeCheckinDateTime={jest.fn()}
      onSubmit={jest.fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={isSubmitSuccess}
      RentalItemSelect={() => <Text color="$color">Product Picker</Text>}
      rentalsFieldArray={rentalsFieldArray}
      tickets={mockTickets}
    />
  );
};

describe('RentalCheckinFormView', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  describe('desktop layout (media.sm undefined)', () => {
    it('renders the picker, cart body and Submit inline with no cart button', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Product Picker')).toBeTruthy();
      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });
  });

  describe('compact layout (media.sm true)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    it('shows only the product picker when the cart is empty', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Product Picker')).toBeTruthy();
      expect(
        screen.queryByRole('textbox', { name: 'Customer Name' })
      ).toBeNull();
      expect(screen.queryByText('Items')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });

    it('shows the cart button with the ticket count and codes-left once a ticket exists', () => {
      render(<Wrapper defaultValues={oneRentalValues} />);

      expect(screen.getByText('1 ticket · 1 code left · View Cart')).toBeTruthy();
    });

    it('shows a pluralized summary for multiple tickets', () => {
      render(<Wrapper defaultValues={threeRentalsValues} />);

      expect(
        screen.getByText('3 tickets · 3 codes left · View Cart')
      ).toBeTruthy();
    });

    it('opens the cart sheet with the full cart body and Submit when the button is pressed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={oneRentalValues} />);

      await user.click(screen.getByText(/View Cart/));

      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(screen.getAllByPlaceholderText('Code')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('closes the cart sheet when the close control is pressed, keeping values intact', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={oneRentalValues} />);

      await user.click(screen.getByText(/View Cart/));
      const [nameInput] = screen.getAllByRole('textbox', {
        name: 'Customer Name',
      });
      await user.type(nameInput, 'Jane Doe');
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Close Cart' }));
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();

      await user.click(screen.getByText(/View Cart/));
      expect(screen.getByDisplayValue('Jane Doe')).toBeTruthy();
    });

    it('decrements codes left as a code is typed and collapses the summary once full', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={oneRentalValues} />);

      await user.click(screen.getByText(/View Cart/));
      const [codeInput] = screen.getAllByPlaceholderText('Code');
      await user.type(codeInput, mockTickets[0].code);

      expect(screen.getByText('1 ticket · View Cart')).toBeTruthy();
    });

    describe('close-on-success (PRD FR-4)', () => {
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
