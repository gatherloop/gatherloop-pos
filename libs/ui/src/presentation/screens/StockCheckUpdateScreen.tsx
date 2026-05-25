import { ScrollView } from 'tamagui';
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
  onClearQuery: () => void;
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
      <ScrollView>
        <StockCheckFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          serverError={props.serverError}
          query={props.query}
          onQueryChange={props.onQueryChange}
          onClearQuery={props.onClearQuery}
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
