import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChecklistTemplateFormView } from './ChecklistTemplateFormView';
import type { ChecklistTemplateForm } from '../../../domain';

const emptyValues: ChecklistTemplateForm = {
  name: '',
  description: '',
  items: [
    {
      name: '',
      description: '',
      displayOrder: 1,
      subItems: [],
    },
  ],
};

const populatedValues: ChecklistTemplateForm = {
  name: 'Opening Checklist',
  description:
    '## Opening Routine\n\nRun through this checklist **before** opening the store to customers.',
  items: [
    {
      name: 'Turn on lamp',
      description:
        '- Bar lamp\n- Door lamp\n- Storage lamp\n\nSwitches are behind the cashier.',
      displayOrder: 1,
      subItems: [],
    },
    {
      name: 'Count cash drawer',
      description: '',
      displayOrder: 2,
      subItems: [
        { name: 'Count Rp100,000 notes', displayOrder: 1 },
        { name: 'Count Rp50,000 notes', displayOrder: 2 },
      ],
    },
  ],
};

const meta: Meta<typeof ChecklistTemplateFormView> = {
  title: 'Features/ChecklistTemplates/ChecklistTemplateFormView',
  component: ChecklistTemplateFormView,
};

export default meta;
type Story = StoryObj<typeof ChecklistTemplateFormView>;

export const Empty: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: emptyValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Empty.args,
    defaultValues: populatedValues,
  },
};

export const Loading: Story = {
  args: {
    ...Empty.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Empty.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};
