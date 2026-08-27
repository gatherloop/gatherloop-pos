import { ScrollView } from 'tamagui';
import { TableFormView, TableFormViewProps, Layout } from '../components';
import { TableForm } from '../../domain';

export type TableCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: TableForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TableForm) => void;
  variant: TableFormViewProps['variant'];
  serverError?: string;
};

export const TableCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: TableCreateScreenProps) => {
  return (
    <Layout onLogoutPress={onLogoutPress} title="Create Table" showBackButton>
      <ScrollView>
        <TableFormView
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
