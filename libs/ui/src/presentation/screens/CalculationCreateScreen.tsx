import { ScrollView } from 'tamagui';
import {
  CalculationFormView,
  CalculationFormViewProps,
  Layout,
} from '../components';
import { CalculationForm } from '../../domain';

export type CalculationCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: CalculationForm;
  getTotalWallet: (totalWallet: number, walletId: number) => number;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CalculationForm) => void;
  variant: CalculationFormViewProps['variant'];
  walletSelectOptions: {
    label: string;
    value: number;
  }[];
  serverError?: string;
};

export const CalculationCreateScreen = ({
  defaultValues,
  getTotalWallet,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  walletSelectOptions,
  serverError,
}: CalculationCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Calculation"
      showBackButton
    >
      <ScrollView>
        <CalculationFormView
          defaultValues={defaultValues}
          getTotalWallet={getTotalWallet}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
          walletSelectOptions={walletSelectOptions}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
