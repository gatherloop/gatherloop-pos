import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KdsDeviceSetupHandler } from './KdsDeviceSetupHandler';
import {
  MockAuthRepository,
  MockKdsDeviceRepository,
  MockPushTokenRepository,
} from '../../../data/mock';
import { AuthLogoutUsecase, KdsDeviceRegisterUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = () => {
  const kdsDeviceRepository = new MockKdsDeviceRepository();
  const pushTokenRepository = new MockPushTokenRepository();
  const authRepository = new MockAuthRepository();
  return {
    handlerProps: {
      kdsDeviceRegisterUsecase: new KdsDeviceRegisterUsecase(
        kdsDeviceRepository,
        pushTokenRepository,
        'android' as const
      ),
      kdsDeviceRepository,
      authLogoutUsecase: new AuthLogoutUsecase(authRepository),
    },
    pushTokenRepository,
  };
};

const registerDevice = async (
  user: ReturnType<typeof userEvent.setup>,
  name = "Andi's phone"
) => {
  await user.type(screen.getByRole('textbox', { name: 'Device Name' }), name);
  await user.click(
    screen.getByRole('button', { name: 'Grant Permission & Register' })
  );
  await act(async () => {
    await flushPromises();
  });
};

describe('KdsDeviceSetupHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the device name field and register button initially', () => {
    const { handlerProps } = createProps();
    render(<KdsDeviceSetupHandler {...handlerProps} />);
    expect(screen.getByRole('textbox', { name: 'Device Name' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Grant Permission & Register' })
    ).toBeTruthy();
  });

  it('should reach the registered state after granting permission and registering', async () => {
    const { handlerProps } = createProps();
    const user = userEvent.setup();
    render(<KdsDeviceSetupHandler {...handlerProps} />);

    await registerDevice(user);

    expect(screen.getByText(/Registered as "Andi's phone"/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Send test notification' })
    ).toBeTruthy();
  });

  it('should render settings instructions when permission is denied', async () => {
    const { handlerProps, pushTokenRepository } = createProps();
    pushTokenRepository.setPermissionStatus('denied');
    const user = userEvent.setup();
    render(<KdsDeviceSetupHandler {...handlerProps} />);

    await registerDevice(user, 'Counter phone');

    expect(
      screen.getByText(/Notification permission was denied/)
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Device Name' })).toBeNull();
  });

  it('should send a test notification once registered', async () => {
    const { handlerProps } = createProps();
    const user = userEvent.setup();
    render(<KdsDeviceSetupHandler {...handlerProps} />);

    await registerDevice(user);

    await user.click(
      screen.getByRole('button', { name: 'Send test notification' })
    );
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Test notification sent')).toBeTruthy();
  });

  it('should log out after unregistering', async () => {
    const { handlerProps } = createProps();
    const user = userEvent.setup();
    render(<KdsDeviceSetupHandler {...handlerProps} />);

    await registerDevice(user);

    await user.click(screen.getByRole('button', { name: 'Unregister' }));
    await act(async () => {
      await flushPromises();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });
});
