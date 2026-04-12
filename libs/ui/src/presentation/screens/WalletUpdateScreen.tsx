import { ScrollView } from 'tamagui';
import { WalletFormView, Layout } from '../components';
import { WalletForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';
import { WalletFormViewProps } from '../components';

export type WalletUpdateScreenProps = {
  form: UseFormReturn<WalletForm>;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: WalletFormViewProps['variant'];
};

export const WalletUpdateScreen = (props: WalletUpdateScreenProps) => {
  return (
    <Layout title="Update Wallet" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
        />
      </ScrollView>
    </Layout>
  );
};
