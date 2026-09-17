import { Button, Card, H2, Paragraph, ScrollView, Spinner, XStack } from 'tamagui';
import { KdsDevice, KdsDeviceForm } from '../../../../domain';
import { FormErrorBanner, FormVariant, KdsDeviceSetupForm } from '../../components';

export type KdsDeviceSetupScreenProps = {
  defaultValues: KdsDeviceForm;
  formVariant: FormVariant;
  isRegisterDisabled: boolean;
  isRegistering: boolean;
  isPermissionDenied: boolean;
  registerError?: string;
  onSubmit: (values: KdsDeviceForm) => void;
  onOpenSettings: () => void;
  registeredDevice?: KdsDevice;
  isSendingTestNotification: boolean;
  isTestNotificationSent: boolean;
  testNotificationError?: string;
  onSendTestNotification: () => void;
  onUnregister: () => void;
  onLogout: () => void;
};

export const KdsDeviceSetupScreen = (props: KdsDeviceSetupScreenProps) => {
  return (
    <ScrollView
      padding="$3"
      contentContainerStyle={{
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <Card elevate size="$4" bordered width={420} maxWidth="100%">
        <Card.Header padded gap="$3">
          <H2>Device Setup</H2>
          {props.registeredDevice ? (
            <RegisteredView
              device={props.registeredDevice}
              isSendingTestNotification={props.isSendingTestNotification}
              isTestNotificationSent={props.isTestNotificationSent}
              testNotificationError={props.testNotificationError}
              onSendTestNotification={props.onSendTestNotification}
              onUnregister={props.onUnregister}
              onLogout={props.onLogout}
            />
          ) : (
            <SetupView
              defaultValues={props.defaultValues}
              formVariant={props.formVariant}
              isRegisterDisabled={props.isRegisterDisabled}
              isRegistering={props.isRegistering}
              isPermissionDenied={props.isPermissionDenied}
              registerError={props.registerError}
              onSubmit={props.onSubmit}
              onOpenSettings={props.onOpenSettings}
            />
          )}
        </Card.Header>
      </Card>
    </ScrollView>
  );
};

type SetupViewProps = Pick<
  KdsDeviceSetupScreenProps,
  | 'defaultValues'
  | 'formVariant'
  | 'isRegisterDisabled'
  | 'isRegistering'
  | 'isPermissionDenied'
  | 'registerError'
  | 'onSubmit'
  | 'onOpenSettings'
>;

const SetupView = (props: SetupViewProps) => (
  <>
    <Paragraph theme="alt2">
      Name this device, grant notification permission and register it to
      start receiving new order alerts.
    </Paragraph>
    {props.isPermissionDenied ? (
      <Card theme="red" padded bordered>
        <Paragraph>
          Notification permission was denied. Requesting it again will not
          prompt the OS a second time — open the device settings and enable
          notifications for this app instead.
        </Paragraph>
        <Button marginTop="$3" onPress={props.onOpenSettings}>
          Open settings
        </Button>
      </Card>
    ) : (
      <KdsDeviceSetupForm
        variant={props.formVariant}
        defaultValues={props.defaultValues}
        onSubmit={props.onSubmit}
        isSubmitDisabled={props.isRegisterDisabled}
        isSubmitting={props.isRegistering}
        serverError={props.registerError}
      />
    )}
  </>
);

type RegisteredViewProps = Pick<
  KdsDeviceSetupScreenProps,
  | 'isSendingTestNotification'
  | 'isTestNotificationSent'
  | 'testNotificationError'
  | 'onSendTestNotification'
  | 'onUnregister'
  | 'onLogout'
> & { device: KdsDevice };

const RegisteredView = (props: RegisteredViewProps) => (
  <>
    <Paragraph theme="alt2">
      Registered as &quot;{props.device.name}&quot;. Keep this device on and
      the alert sound on — new orders will buzz automatically.
    </Paragraph>
    <Button
      onPress={props.onSendTestNotification}
      disabled={props.isSendingTestNotification}
      icon={props.isSendingTestNotification ? <Spinner /> : undefined}
    >
      {props.isTestNotificationSent
        ? 'Test notification sent'
        : 'Send test notification'}
    </Button>
    <FormErrorBanner message={props.testNotificationError} />
    <XStack gap="$3">
      <Button flex={1} theme="red" onPress={props.onUnregister}>
        Unregister
      </Button>
      <Button flex={1} onPress={props.onLogout}>
        Log out
      </Button>
    </XStack>
  </>
);
