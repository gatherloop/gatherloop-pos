import { Button, Card, Form, Spinner, XStack, YStack } from 'tamagui';
import { RentalCheckinForm, Ticket } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { RentalCheckinCartView } from './RentalCheckinCartView';

export type RentalCheckinFormViewProps = {
  form: UseFormReturn<RentalCheckinForm>;
  onToggleCustomizeCheckinDateTime: (checked: boolean) => void;
  onSubmit: (form: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckinForm, 'rentals', 'key'>;
  tickets: Ticket[];
  serverError?: string;
};

export const RentalCheckinFormView = ({
  form,
  onToggleCustomizeCheckinDateTime,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  RentalItemSelect,
  rentalsFieldArray,
  tickets,
  serverError,
}: RentalCheckinFormViewProps) => {
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <YStack>
            <YStack gap="$3">
              <XStack gap="$3">
                <YStack flex={1}>{RentalItemSelect()}</YStack>

                <Card padded width={350} flex={1}>
                  <RentalCheckinCartView
                    form={form}
                    rentalsFieldArray={rentalsFieldArray}
                    tickets={tickets}
                    onToggleCustomizeCheckinDateTime={
                      onToggleCustomizeCheckinDateTime
                    }
                    serverError={serverError}
                  />
                </Card>
              </XStack>
            </YStack>
          </YStack>
          <XStack justifyContent="flex-end" gap="$3">
            <Button
              disabled={isSubmitDisabled}
              onPress={form.handleSubmit(onSubmit)}
              size="$5"
              theme="blue"
              icon={isSubmitting ? <Spinner /> : undefined}
            >
              Submit
            </Button>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
