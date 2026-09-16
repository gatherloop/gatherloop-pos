import {
  AvailabilityFormView,
  AvailabilityFormViewProps,
  AvailabilityMovementHistorySheet,
  AvailabilityMovementHistorySheetProps,
  Layout,
} from '../../components';
import { AvailabilityForm, AvailabilityProduct } from '../../../../domain';
import { AvailabilityViewHistoryPress } from '../../components/availability/AvailabilityVariantRow';

export type AvailabilityScreenProps = {
  variant: AvailabilityFormViewProps['variant'];
  products: AvailabilityProduct[];
  defaultValues: AvailabilityForm;
  onSubmit: (values: AvailabilityForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
  onViewHistoryPress: AvailabilityViewHistoryPress;
  historySheet: AvailabilityMovementHistorySheetProps;
};

export const AvailabilityScreen = (props: AvailabilityScreenProps) => {
  return (
    <Layout title="Availability" onLogoutPress={props.onLogoutPress}>
      <AvailabilityFormView
        variant={props.variant}
        products={props.products}
        defaultValues={props.defaultValues}
        onSubmit={props.onSubmit}
        isSubmitDisabled={props.isSubmitDisabled}
        isSubmitting={props.isSubmitting}
        serverError={props.serverError}
        onViewHistoryPress={props.onViewHistoryPress}
      />
      <AvailabilityMovementHistorySheet {...props.historySheet} />
    </Layout>
  );
};
