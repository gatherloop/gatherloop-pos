import { ScrollView } from 'tamagui';
import { WalletTransferFormView, Layout } from '../components';
import { WalletTransferForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type WalletTransferCreateScreenProps = {
  form: UseFormReturn<WalletTransferForm>;
  onSubmit: (values: WalletTransferForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  walletSelectOptions: Array<{ label: string; value: number }>;
  serverError?: string;
};

export const WalletTransferCreateScreen = (props: WalletTransferCreateScreenProps) => {
  return (
    <Layout title="Create Transfer" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletTransferFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          walletSelectOptions={props.walletSelectOptions}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
