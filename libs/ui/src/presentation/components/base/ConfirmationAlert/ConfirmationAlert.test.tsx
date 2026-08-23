import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMedia } from 'tamagui';
import { ConfirmationAlert } from './ConfirmationAlert';

const Wrapper = ({
  isOpen = true,
  title = 'Print Checkin Slip',
  description = 'Do you want to print checkin slip ?',
  onConfirm = jest.fn(),
  onCancel = jest.fn(),
}: {
  isOpen?: boolean;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) => (
  <ConfirmationAlert
    title={title}
    description={description}
    isOpen={isOpen}
    onOpenChange={jest.fn()}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

describe('ConfirmationAlert', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  it('renders nothing when closed', () => {
    const { container } = render(<Wrapper isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title, description and both buttons when open', () => {
    render(<Wrapper />);

    expect(screen.getByText('Print Checkin Slip')).toBeTruthy();
    expect(screen.getByText('Do you want to print checkin slip ?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
  });

  it('calls onConfirm when Yes is pressed', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<Wrapper onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when No is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<Wrapper onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(onCancel).toHaveBeenCalled();
  });

  // PRD "rental checkin mobile" FR-5: the print prompt (and any other
  // `useConfirmationAlert()` caller) must stay fully usable at compact
  // widths — bounded width/height on the dialog, with the title and
  // description scrolling internally so the Yes/No row is never pushed
  // off-screen.
  describe('compact layout (media.sm true)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    it('still renders the title, description and both buttons', () => {
      render(<Wrapper />);

      expect(screen.getByText('Print Checkin Slip')).toBeTruthy();
      expect(
        screen.getByText('Do you want to print checkin slip ?')
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
    });

    it('renders a long title and description without dropping the buttons', () => {
      const longDescription = 'Lorem ipsum dolor sit amet. '.repeat(20);
      render(
        <Wrapper
          title="A very long confirmation title that could wrap across several lines on a narrow screen"
          description={longDescription}
        />
      );

      expect(
        screen.getByText(/Lorem ipsum dolor sit amet\./)
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
    });
  });
});
