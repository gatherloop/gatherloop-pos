import {
  StockCheckFormView,
  StockCheckFormViewProps,
  Layout,
} from '../../components';
import { StockCheckForm } from '../../../../domain';

export type StockCheckCreateScreenProps = {
  variant: StockCheckFormViewProps['variant'];
  defaultValues: StockCheckForm;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const StockCheckCreateScreen = (props: StockCheckCreateScreenProps) => {
  return (
    <Layout
      title="Create Stock Check"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <StockCheckFormView
        variant={props.variant}
        defaultValues={props.defaultValues}
        onSubmit={props.onSubmit}
        isSubmitDisabled={props.isSubmitDisabled}
        isSubmitting={props.isSubmitting}
        serverError={props.serverError}
      />
    </Layout>
  );
};
