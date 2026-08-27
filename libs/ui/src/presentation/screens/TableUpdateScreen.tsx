import { ScrollView, Separator, YStack } from 'tamagui';
import {
  TableFormView,
  TableFormViewProps,
  TableQrCode,
  TableRegenerateCodeAlert,
  Layout,
} from '../components';
import { Table, TableForm } from '../../domain';

export type TableUpdateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: TableForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TableForm) => void;
  variant: TableFormViewProps['variant'];
  serverError?: string;
  table: Table | null;
  onPrintPress: () => void;
  onRegenerateCodePress: () => void;
  isRegenerateAlertOpen: boolean;
  isRegenerateButtonDisabled: boolean;
  onRegenerateCancel: () => void;
  onRegenerateConfirm: () => void;
};

export const TableUpdateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
  table,
  onPrintPress,
  onRegenerateCodePress,
  isRegenerateAlertOpen,
  isRegenerateButtonDisabled,
  onRegenerateCancel,
  onRegenerateConfirm,
}: TableUpdateScreenProps) => {
  return (
    <Layout onLogoutPress={onLogoutPress} title="Edit Table" showBackButton>
      <ScrollView>
        <YStack gap="$4">
          <TableFormView
            defaultValues={defaultValues}
            isSubmitDisabled={isSubmitDisabled}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            variant={variant}
            serverError={serverError}
          />

          {table && (
            <>
              <Separator />
              <TableQrCode
                code={table.code}
                label={table.label}
                onPrintPress={onPrintPress}
                onRegenerateCodePress={onRegenerateCodePress}
              />
            </>
          )}
        </YStack>
      </ScrollView>

      <TableRegenerateCodeAlert
        isOpen={isRegenerateAlertOpen}
        onCancel={onRegenerateCancel}
        onConfirm={onRegenerateConfirm}
        isButtonDisabled={isRegenerateButtonDisabled}
      />
    </Layout>
  );
};
