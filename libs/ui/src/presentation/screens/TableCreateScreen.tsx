import { ScrollView } from 'tamagui';
import { TableFormView, TableFormViewProps, Layout } from '../components';
import { TableForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type TableCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<TableForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TableForm) => void;
  variant: TableFormViewProps['variant'];
  serverError?: string;
};

export const TableCreateScreen = ({
  form,
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
