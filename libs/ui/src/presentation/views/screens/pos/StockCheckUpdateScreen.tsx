import {
  StockCheckFormView,
  StockCheckFormViewProps,
  Layout,
} from '../../components';
import { StockCheckForm } from '../../../../domain';

export type StockCheckUpdateScreenProps = {
  variant: StockCheckFormViewProps['variant'];
  defaultValues: StockCheckForm;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const StockCheckUpdateScreen = (props: StockCheckUpdateScreenProps) => {
  return (
    <Layout
      title="Edit Stock Check"
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
