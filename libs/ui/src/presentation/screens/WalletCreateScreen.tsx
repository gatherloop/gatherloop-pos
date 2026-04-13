import { ScrollView } from 'tamagui';
import { WalletFormView, Layout } from '../components';
import { WalletForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type WalletCreateScreenProps = {
  form: UseFormReturn<WalletForm>;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
};

export const WalletCreateScreen = (props: WalletCreateScreenProps) => {
  return (
    <Layout title="Create Wallet" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={{ type: 'loaded' }}
        />
      </ScrollView>
    </Layout>
  );
};
