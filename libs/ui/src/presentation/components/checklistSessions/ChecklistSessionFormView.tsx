import { Button, Card, Form, XStack } from 'tamagui';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Field, InputText, Select } from '../base';
import { ChecklistSessionForm } from '../../../domain';
import { ChecklistTemplate } from '../../../domain';

export type ChecklistSessionFormViewProps = {
  form: UseFormReturn<ChecklistSessionForm>;
  onSubmit: (values: ChecklistSessionForm) => void;
  isSubmitDisabled: boolean;
  checklistTemplates: ChecklistTemplate[];
};

export const ChecklistSessionFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  checklistTemplates,
}: ChecklistSessionFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Card padding="$3" gap="$3">
          <Field name="checklistTemplateId" label="Checklist Template">
            <Select<number>
              items={checklistTemplates.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </Field>

          <Field name="date" label="Date">
            <InputText placeholder="YYYY-MM-DD" />
          </Field>
        </Card>

        <XStack justifyContent="flex-end">
          <Button
            disabled={isSubmitDisabled}
            onPress={form.handleSubmit(onSubmit)}
            theme="blue"
          >
            Start Session
          </Button>
        </XStack>
      </Form>
    </FormProvider>
  );
};
