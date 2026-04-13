import { ScrollView } from 'tamagui';
import {
  CalculationFormView,
  CalculationFormViewProps,
  Layout,
} from '../components';
import { CalculationForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CalculationUpdateScreenProps = {
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
  serverError?: string;
};

export const CalculationUpdateScreen = ({
  onLogoutPress,
  form,
  getTotalWallet,
  isSubmitDisabled,
  isSubmitting,
  onRetryButtonPress,
  onSubmit,
  variant,
  walletSelectOptions,
  serverError,
}: CalculationUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Calculation"
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
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
