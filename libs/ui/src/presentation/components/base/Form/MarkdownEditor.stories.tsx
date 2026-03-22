/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { MarkdownEditor } from './MarkdownEditor';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({
    defaultValues: {
      description:
        '# Hello World\n\nThis is a **markdown** editor.\n\n- Item 1\n- Item 2\n- Item 3\n\n> A blockquote example',
    },
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const withEmptyFormProvider: Decorator = (Story) => {
  const form = useForm({ defaultValues: { description: '' } });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof MarkdownEditor> = {
  title: 'Base/Form/MarkdownEditor',
  component: MarkdownEditor,
  decorators: [withFormProvider],
  args: {
    name: 'description',
    defaultMode: 'preview',
  },
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

export const PreviewMode: Story = {
  args: {
    defaultMode: 'preview',
  },
};

export const EditMode: Story = {
  args: {
    defaultMode: 'edit',
  },
};

export const EmptyContent: Story = {
  decorators: [withEmptyFormProvider],
  args: {
    defaultMode: 'edit',
  },
};
