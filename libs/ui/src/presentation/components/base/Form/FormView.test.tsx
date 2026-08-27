import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'tamagui';
import { FormView } from './FormView';
import { Field } from './Field';
import { InputText } from './InputText';
import { flushPromises } from '../../../../utils/testUtils';

type DemoForm = { name: string };

const demoFormResolver = zodResolver(
  z.object({ name: z.string().min(1) }) satisfies z.ZodType<DemoForm>
);

const renderDemo = (props: Partial<React.ComponentProps<typeof FormView<DemoForm>>> = {}) => {
  const onSubmit = jest.fn();
  const utils = render(
    <FormView
      variant={{ type: 'loading' }}
      defaultValues={{ name: '' }}
      resolver={demoFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Fetching Demo..."
      errorTitle="Failed to Fetch Demo"
      {...props}
    >
      {(form) => (
        <>
          <Field name="name" label="Name">
            <InputText />
          </Field>
          <Button onPress={form.handleSubmit(onSubmit)}>Submit</Button>
        </>
      )}
    </FormView>
  );
  return { onSubmit, ...utils };
};

describe('FormView', () => {
  it('shows the loading title while variant is loading', () => {
    renderDemo({ variant: { type: 'loading' } });
    expect(screen.getByText('Fetching Demo...')).toBeTruthy();
  });

  it('shows the error view and calls onRetryButtonPress when the retry button is pressed', async () => {
    const user = userEvent.setup();
    const onRetryButtonPress = jest.fn();
    renderDemo({ variant: { type: 'error', onRetryButtonPress } });

    expect(screen.getByRole('heading', { name: 'Failed to Fetch Demo' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryButtonPress).toHaveBeenCalled();
  });

  it('mounts the form with the final defaultValues once loading transitions to loaded', () => {
    const { rerender } = render(
      <FormView
        variant={{ type: 'loading' }}
        defaultValues={{ name: '' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => (
          <Field name="name" label="Name">
            <InputText />
          </Field>
        )}
      </FormView>
    );

    expect(screen.queryByDisplayValue('Fetched')).toBeNull();

    rerender(
      <FormView
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Fetched' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => (
          <Field name="name" label="Name">
            <InputText />
          </Field>
        )}
      </FormView>
    );

    expect(screen.getByDisplayValue('Fetched')).toBeTruthy();
  });

  it('does not reset the field when defaultValues gets a new reference while staying loaded', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDemo({
      variant: { type: 'loaded' },
      defaultValues: { name: 'Original' },
    });

    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(input);
    await user.type(input, 'Edited by user');

    rerender(
      <FormView
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Original' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => (
          <Field name="name" label="Name">
            <InputText />
          </Field>
        )}
      </FormView>
    );

    expect(screen.getByDisplayValue('Edited by user')).toBeTruthy();
  });

  it('surfaces the resolver error message and does not call onSubmit for invalid values', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDemo({ variant: { type: 'loaded' } });

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with parsed values for valid input', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDemo({ variant: { type: 'loaded' } });

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Valid Name');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => {
      await flushPromises();
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Valid Name' }, expect.anything());
  });
});
