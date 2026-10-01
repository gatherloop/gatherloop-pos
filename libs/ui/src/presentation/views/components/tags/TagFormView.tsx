import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  Switch,
  FormView,
  FormVariant,
} from '../base';
import { TagForm, tagFormSchema } from '../../../../domain';
import { TagColorPicker } from './TagColorPicker';

const tagFormResolver = zodResolver(tagFormSchema);

export type TagFormViewProps = {
  variant: FormVariant;
  defaultValues: TagForm;
  onSubmit: (values: TagForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const TagFormView = (props: TagFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={tagFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Tag..."
    errorTitle="Failed to Fetch Tag"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="color" label="Colour">
          <TagColorPicker />
        </Field>
        <Field name="isHighlighted" label="Show as section on order app">
          <Switch />
        </Field>
        <Field name="sortOrder" label="Sort order">
          <InputNumber />
        </Field>
        <Button
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
