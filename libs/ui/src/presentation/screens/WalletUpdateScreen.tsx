import { ScrollView } from 'tamagui';
import { WalletFormView, WalletFormViewProps, Layout } from '../components';
import { WalletForm } from '../../domain';

export type WalletUpdateScreenProps = {
  defaultValues: WalletForm;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: WalletFormViewProps['variant'];
  serverError?: string;
};

export const WalletUpdateScreen = (props: WalletUpdateScreenProps) => {
  return (
    <Layout title="Update Wallet" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletFormView
          defaultValues={props.defaultValues}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
