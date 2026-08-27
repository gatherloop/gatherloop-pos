import { ScrollView } from 'tamagui';
import {
  TicketFormView,
  TicketFormViewProps,
  Layout,
} from '../components';
import { TicketForm } from '../../domain';

export type TicketCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: TicketForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TicketForm) => void;
  variant: TicketFormViewProps['variant'];
  serverError?: string;
};

export const TicketCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: TicketCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Ticket"
      showBackButton
    >
      <ScrollView>
        <TicketFormView
          defaultValues={defaultValues}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
