import { Button, Card, Form, Label, YStack } from 'tamagui';
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
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Card padding="$3">
          <YStack gap="$3" $gtMd={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <YStack flex={1}>
              <Field name="checklistTemplateId" label="Checklist Template">
                <Select<number>
                  items={checklistTemplates.map((t) => ({
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
              <Label opacity={0} pointerEvents="none" $gtMd={{ display: 'flex' }} display="none">
                {' '}
              </Label>
              <Button
                disabled={isSubmitDisabled}
                onPress={form.handleSubmit(onSubmit)}
                theme="blue"
              >
                Start Session
              </Button>
            </YStack>
          </YStack>
        </Card>
      </Form>
    </FormProvider>
  );
};
