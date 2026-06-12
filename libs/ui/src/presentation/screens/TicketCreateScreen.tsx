import { ScrollView } from 'tamagui';
import {
  TicketFormView,
  TicketFormViewProps,
  Layout,
} from '../components';
import { TicketForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type TicketCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<TicketForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TicketForm) => void;
  variant: TicketFormViewProps['variant'];
  serverError?: string;
};

export const TicketCreateScreen = ({
  form,
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
