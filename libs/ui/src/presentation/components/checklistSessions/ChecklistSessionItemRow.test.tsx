import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChecklistSessionItemRow } from './ChecklistSessionItemRow';
import { ChecklistSessionItem } from '../../../domain';

const baseItem: ChecklistSessionItem = {
  id: 1,
  checklistSessionId: 1,
  checklistTemplateItemId: 1,
  name: 'Turn on lamp',
  description: null,
  displayOrder: 1,
  completedAt: null,
  subItems: [],
  createdAt: '2024-03-20T00:00:00.000Z',
  updatedAt: '2024-03-20T00:00:00.000Z',
};

const noop = () => undefined;

const renderRow = (item: ChecklistSessionItem) =>
  render(
    <ChecklistSessionItemRow
      item={item}
      onCheckItem={noop}
      onUncheckItem={noop}
      onCheckSubItem={noop}
      onUncheckSubItem={noop}
      togglingItemId={null}
      togglingSubItemId={null}
    />
  );

describe('ChecklistSessionItemRow', () => {
  it('renders the description through the Markdown component', () => {
    renderRow({
      ...baseItem,
      description: '- Bar lamp\n- Door lamp\n\n**Switches are behind the cashier**',
    });

    const markdown = screen.getByTestId('markdown');
    expect(markdown).toBeTruthy();
    expect(markdown.textContent).toContain('Bar lamp');
    expect(markdown.textContent).toContain('Switches are behind the cashier');
  });

  it('does not render the Markdown component when there is no description', () => {
    renderRow(baseItem);
    expect(screen.queryByTestId('markdown')).toBeNull();
  });
});
