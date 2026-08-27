import {
  StockCheckFormView,
  StockCheckFormViewProps,
  Layout,
} from '../components';
import { StockCheckForm } from '../../domain';

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
      {/* PRD docs/prd-stock-check-form-mobile.md FR-4: `StockCheckFormView`
          owns its own bounded scroll region (pinned header + `ScrollView
          flex={1}`) so the search/filter header stays visible on both web
          and React Native — an outer `ScrollView` here would give it no
          height to bound against. */}
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
