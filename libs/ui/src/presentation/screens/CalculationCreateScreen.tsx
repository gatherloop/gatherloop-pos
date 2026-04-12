import { ScrollView } from 'tamagui';
import {
  CalculationFormView,
  CalculationFormViewProps,
  Layout,
} from '../components';
import { CalculationForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CalculationCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<CalculationForm>;
  getTotalWallet: (totalWallet: number, walletId: number) => number;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onRetryButtonPress: () => void;
  onSubmit: (values: CalculationForm) => void;
  variant: CalculationFormViewProps['variant'];
  walletSelectOptions: {
    label: string;
    value: number;
  }[];
};

export const CalculationCreateScreen = ({
  form,
  getTotalWallet,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onRetryButtonPress,
  onSubmit,
  variant,
  walletSelectOptions,
}: CalculationCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Calculation"
      showBackButton
    >
      <ScrollView>
        <CalculationFormView
          form={form}
          getTotalWallet={getTotalWallet}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onRetryButtonPress={onRetryButtonPress}
          onSubmit={onSubmit}
          variant={variant}
          walletSelectOptions={walletSelectOptions}
        />
      </ScrollView>
    </Layout>
  );
};
