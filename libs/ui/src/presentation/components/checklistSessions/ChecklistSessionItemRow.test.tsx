import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const itemWithDescription: ChecklistSessionItem = {
  ...baseItem,
  description: '- Bar lamp\n- Door lamp\n\n**Switches are behind the cashier**',
};

const itemWithSubItems: ChecklistSessionItem = {
  ...baseItem,
  name: 'Clean tables',
  subItems: [
    {
      id: 1,
      checklistSessionItemId: 1,
      checklistTemplateSubItemId: 1,
      name: 'Table 1',
      displayOrder: 1,
      completedAt: '2024-03-20T00:00:00.000Z',
      createdAt: '2024-03-20T00:00:00.000Z',
      updatedAt: '2024-03-20T00:00:00.000Z',
    },
    {
      id: 2,
      checklistSessionItemId: 1,
      checklistTemplateSubItemId: 2,
      name: 'Table 2',
      displayOrder: 2,
      completedAt: null,
      createdAt: '2024-03-20T00:00:00.000Z',
      updatedAt: '2024-03-20T00:00:00.000Z',
    },
  ],
};

const noop = () => undefined;

const renderRow = (
  item: ChecklistSessionItem,
  handlers: {
    onCheckItem?: (itemId: number) => void;
    onUncheckItem?: (itemId: number) => void;
  } = {}
) =>
  render(
    <ChecklistSessionItemRow
      item={item}
      onCheckItem={handlers.onCheckItem ?? noop}
      onUncheckItem={handlers.onUncheckItem ?? noop}
      onCheckSubItem={noop}
      onUncheckSubItem={noop}
      togglingItemId={null}
      togglingSubItemId={null}
    />
  );

describe('ChecklistSessionItemRow', () => {
  it('does not render the Markdown component or a description toggle when there is no description', () => {
    renderRow(baseItem);

    expect(screen.queryByTestId('markdown')).toBeNull();
    expect(screen.queryByTestId('description-toggle')).toBeNull();
  });

  it('hides the description behind a toggle by default', () => {
    renderRow(itemWithDescription);

    expect(screen.getByTestId('description-toggle')).toBeTruthy();
    expect(screen.queryByTestId('markdown')).toBeNull();
  });

  it('reveals the description through the Markdown component when the toggle is pressed', () => {
    renderRow(itemWithDescription);

    fireEvent.click(screen.getByTestId('description-toggle'));

    const markdown = screen.getByTestId('markdown');
    expect(markdown.textContent).toContain('Bar lamp');
    expect(markdown.textContent).toContain('Switches are behind the cashier');
  });

  it('hides the description again when the toggle is pressed a second time', () => {
    renderRow(itemWithDescription);

    fireEvent.click(screen.getByTestId('description-toggle'));
    fireEvent.click(screen.getByTestId('description-toggle'));

    expect(screen.queryByTestId('markdown')).toBeNull();
  });

  it('does not check the item when the description toggle is pressed', () => {
    const onCheckItem = jest.fn();
    renderRow(itemWithDescription, { onCheckItem });

    fireEvent.click(screen.getByTestId('description-toggle'));

    expect(onCheckItem).not.toHaveBeenCalled();
  });

  it('still checks the item when the row is pressed', () => {
    const onCheckItem = jest.fn();
    renderRow(itemWithDescription, { onCheckItem });

    fireEvent.click(screen.getByText('Turn on lamp'));

    expect(onCheckItem).toHaveBeenCalledWith(itemWithDescription.id);
  });

  it('collapses sub-items by default, showing only the completed/total badge', () => {
    renderRow(itemWithSubItems);

    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.queryByText('Table 1')).toBeNull();
    expect(screen.queryByText('Table 2')).toBeNull();
  });

  it('expands sub-items when the row is pressed, and collapses again on a second press', () => {
    renderRow(itemWithSubItems);

    fireEvent.click(screen.getByText('Clean tables'));

    expect(screen.getByText('Table 1')).toBeTruthy();
    expect(screen.getByText('Table 2')).toBeTruthy();

    fireEvent.click(screen.getByText('Clean tables'));

    expect(screen.queryByText('Table 1')).toBeNull();
    expect(screen.queryByText('Table 2')).toBeNull();
  });
});
