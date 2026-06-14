import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useForm } from 'react-hook-form';
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

const EmptyStory = () => {
  const form = useForm<ChecklistTemplateForm>({ defaultValues: emptyValues });
  return (
    <ChecklistTemplateFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<ChecklistTemplateForm>({
    defaultValues: populatedValues,
  });
  return (
    <ChecklistTemplateFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const meta: Meta<typeof ChecklistTemplateFormView> = {
  title: 'Features/ChecklistTemplates/ChecklistTemplateFormView',
  component: ChecklistTemplateFormView,
};

export default meta;
type Story = StoryObj<typeof ChecklistTemplateFormView>;

export const Empty: Story = {
  render: () => <EmptyStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};
