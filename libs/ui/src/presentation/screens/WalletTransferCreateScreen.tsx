import { ScrollView } from 'tamagui';
import { WalletTransferFormView, Layout } from '../components';
import { WalletTransferForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type WalletTransferCreateScreenProps = {
  form: UseFormReturn<WalletTransferForm>;
  onSubmit: (values: WalletTransferForm) => void;
  isSubmitDisabled: boolean;
  onLogoutPress: () => void;
  walletSelectOptions: Array<{ label: string; value: number }>;
};

export const WalletTransferCreateScreen = (props: WalletTransferCreateScreenProps) => {
  return (
    <Layout title="Create Transfer" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletTransferFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          walletSelectOptions={props.walletSelectOptions}
        />
      </ScrollView>
    </Layout>
  );
};
