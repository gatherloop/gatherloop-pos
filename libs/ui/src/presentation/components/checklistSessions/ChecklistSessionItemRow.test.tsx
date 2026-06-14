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
});
