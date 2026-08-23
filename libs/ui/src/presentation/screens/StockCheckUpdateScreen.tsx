import { StockCheckFormView, Layout } from '../components';
import { StockCheckForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type StockCheckUpdateScreenProps = {
  form: UseFormReturn<StockCheckForm>;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
  query: string;
  onQueryChange: (value: string) => void;
  showOnlyPending: boolean;
  onShowOnlyPendingToggle: () => void;
  filled: number;
  total: number;
  pendingRows: boolean[];
};

export const StockCheckUpdateScreen = (props: StockCheckUpdateScreenProps) => {
  return (
    <Layout
      title="Edit Stock Check"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      {/* PRD docs/prd-stock-check-form-mobile.md FR-4: `StockCheckFormView`
          owns its own bounded scroll region (pinned header + `ScrollView
          flex={1}`) so the search/filter header stays visible on both web
          and React Native — an outer `ScrollView` here would give it no
          height to bound against. */}
      <StockCheckFormView
        form={props.form}
        onSubmit={props.onSubmit}
        isSubmitDisabled={props.isSubmitDisabled}
        isSubmitting={props.isSubmitting}
        serverError={props.serverError}
        query={props.query}
        onQueryChange={props.onQueryChange}
        showOnlyPending={props.showOnlyPending}
        onShowOnlyPendingToggle={props.onShowOnlyPendingToggle}
        filled={props.filled}
        total={props.total}
        pendingRows={props.pendingRows}
      />
    </Layout>
  );
};
