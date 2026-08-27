import { ScrollView } from 'tamagui';
import {
  WalletTransferFormView,
  WalletTransferFormViewProps,
  Layout,
} from '../components';
import { WalletTransferForm } from '../../domain';

export type WalletTransferCreateScreenProps = {
  defaultValues: WalletTransferForm;
  onSubmit: (values: WalletTransferForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: WalletTransferFormViewProps['variant'];
  walletSelectOptions: Array<{ label: string; value: number }>;
  serverError?: string;
};

export const WalletTransferCreateScreen = (props: WalletTransferCreateScreenProps) => {
  return (
    <Layout title="Create Transfer" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <WalletTransferFormView
          defaultValues={props.defaultValues}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          walletSelectOptions={props.walletSelectOptions}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
