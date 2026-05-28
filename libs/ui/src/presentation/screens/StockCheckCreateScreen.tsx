import { ScrollView } from 'tamagui';
import { StockCheckFormView, Layout } from '../components';
import { StockCheckForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type StockCheckCreateScreenProps = {
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

export const StockCheckCreateScreen = (props: StockCheckCreateScreenProps) => {
  return (
    <Layout
      title="Create Stock Check"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
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
      </ScrollView>
    </Layout>
  );
};
