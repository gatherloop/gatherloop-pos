import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvailabilityHandler } from './AvailabilityHandler';
import { MockAuthRepository, MockAvailabilityRepository } from '../../../data/mock';
import {
  AuthLogoutUsecase,
  AvailabilityListUsecase,
  AvailabilityMovementListUsecase,
  AvailabilityUpdateUsecase,
} from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = () => {
  const availabilityRepository = new MockAvailabilityRepository();
  return {
    props: {
      authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
      availabilityListUsecase: new AvailabilityListUsecase(availabilityRepository, {
        products: [],
      }),
      availabilityUpdateUsecase: new AvailabilityUpdateUsecase(availabilityRepository),
      availabilityMovementListUsecase: new AvailabilityMovementListUsecase(
        availabilityRepository
      ),
    },
    availabilityRepository,
  };
};

describe('AvailabilityHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders every product once the list has loaded', async () => {
    const { props } = createProps();
    render(<AvailabilityHandler {...props} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Soft Cookies')).toBeTruthy();
    expect(screen.getByText('Pancong')).toBeTruthy();
  });

  it('sends only the rows that changed when Save is pressed', async () => {
    const { props, availabilityRepository } = createProps();
    const updateSpy = jest.spyOn(availabilityRepository, 'updateAvailability');
    const user = userEvent.setup();

    render(<AvailabilityHandler {...props} />);
    await act(async () => {
      await flushPromises();
    });

    // Es Kopi Susu and Pancong each have a variant named "Vanilla" — the first
    // is Es Kopi Susu's, listed first since its category comes first.
    await user.click(screen.getAllByRole('switch', { name: 'Vanilla' })[0]);

    const pancongQuantityInput = screen.getAllByRole('textbox')[3];
    await user.clear(pancongQuantityInput);
    await user.type(pancongQuantityInput, '3');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await act(async () => {
      await flushPromises();
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({
      products: [{ productId: 3, availableQuantity: 3 }],
      variants: [{ variantId: 1, isAvailable: true }],
    });
  });

  it('shows a success toast after a save succeeds', async () => {
    const { props } = createProps();
    const user = userEvent.setup();

    render(<AvailabilityHandler {...props} />);
    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getAllByRole('switch', { name: 'Vanilla' })[0]);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await act(async () => {
      await flushPromises();
    });

    expect(mockToastShow).toHaveBeenCalledWith('Update Availability Success');
  });

  it('shows an error toast and message when a save fails', async () => {
    const { props, availabilityRepository } = createProps();
    const user = userEvent.setup();

    render(<AvailabilityHandler {...props} />);
    await act(async () => {
      await flushPromises();
    });

    availabilityRepository.setShouldFail(true);

    await user.click(screen.getAllByRole('switch', { name: 'Vanilla' })[0]);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await act(async () => {
      await flushPromises();
    });

    expect(mockToastShow).toHaveBeenCalledWith('Update Availability Error');
    expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
  });

  it('opens the history sheet for a variant and shows its movements', async () => {
    const { props } = createProps();
    const user = userEvent.setup();

    render(<AvailabilityHandler {...props} />);
    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getAllByRole('button', { name: 'View history for Choco' })[0]);
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Choco history')).toBeTruthy();
    expect(screen.getByText('Sale')).toBeTruthy();
  });
});
