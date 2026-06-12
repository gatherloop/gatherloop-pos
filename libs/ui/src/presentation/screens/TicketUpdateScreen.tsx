import { ScrollView } from 'tamagui';
import {
  TicketFormView,
  TicketFormViewProps,
  Layout,
} from '../components';
import { TicketForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type TicketUpdateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<TicketForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TicketForm) => void;
  variant: TicketFormViewProps['variant'];
  serverError?: string;
};

export const TicketUpdateScreen = ({
  form,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: TicketUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Ticket"
      showBackButton
    >
      <ScrollView>
        <TicketFormView
          form={form}
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
