import { ScrollView } from 'tamagui';
import { WalletFormView, Layout } from '../components';
import { WalletForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type WalletCreateScreenProps = {
  form: UseFormReturn<WalletForm>;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
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
          variant={{ type: 'loaded' }}
        />
      </ScrollView>
    </Layout>
  );
};
