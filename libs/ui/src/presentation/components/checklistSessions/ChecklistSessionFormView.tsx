import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Label, Spinner, YStack } from 'tamagui';
import {
  Field,
  FormErrorBanner,
  FormVariant,
  FormView,
  InputText,
  Select,
} from '../base';
import { ChecklistSessionForm, checklistSessionFormSchema } from '../../../domain';
import { ChecklistTemplate } from '../../../domain';

const checklistSessionFormResolver = zodResolver(checklistSessionFormSchema);

export type ChecklistSessionFormViewProps = {
  variant: FormVariant;
  defaultValues: ChecklistSessionForm;
  onSubmit: (values: ChecklistSessionForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  checklistTemplates: ChecklistTemplate[];
  serverError?: string;
};

export const ChecklistSessionFormView = (
  props: ChecklistSessionFormViewProps
) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={checklistSessionFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Checklist Session..."
    errorTitle="Failed to Fetch Checklist Session"
  >
    {(form) => (
      <Card padding="$3">
        <FormErrorBanner message={props.serverError} />
        <YStack
          gap="$3"
          $gtMd={{ flexDirection: 'row', alignItems: 'flex-end' }}
        >
          <YStack flex={1}>
            <Field name="checklistTemplateId" label="Checklist Template">
              <Select<number>
                items={props.checklistTemplates.map((t) => ({
                  label: t.name,
                  value: t.id,
                }))}
              />
            </Field>
          </YStack>

          <YStack flex={1}>
            <Field name="date" label="Date">
              <InputText placeholder="YYYY-MM-DD" />
            </Field>
          </YStack>

          <YStack gap="$3">
            <Label
              opacity={0}
              pointerEvents="none"
              $gtMd={{ display: 'flex' }}
              display="none"
            >
              {' '}
            </Label>
            <Button
              disabled={props.isSubmitDisabled}
              onPress={form.handleSubmit(props.onSubmit)}
              theme="blue"
              icon={props.isSubmitting ? <Spinner /> : undefined}
            >
              Start Session
            </Button>
          </YStack>
        </YStack>
      </Card>
    )}
  </FormView>
);
