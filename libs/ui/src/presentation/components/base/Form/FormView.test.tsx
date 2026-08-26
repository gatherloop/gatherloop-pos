import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'tamagui';
import { FormView } from './FormView';
import { Field } from './Field';
import { InputText } from './InputText';
import { flushPromises } from '../../../../utils/testUtils';

type DemoForm = {
  name: string;
};

const demoFormResolver = zodResolver(
  z.object({ name: z.string().min(1) }) satisfies z.ZodType<DemoForm>
);

const NameField = () => (
  <Field name="name" label="Name">
    <InputText />
  </Field>
);

describe('FormView', () => {
  it('mounts the form only once defaultValues are final, so a loading -> loaded transition shows the fetched value', () => {
    const { rerender } = render(
      <FormView<DemoForm>
        variant={{ type: 'loading' }}
        defaultValues={{ name: '' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => <NameField />}
      </FormView>
    );

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Fetching Demo...')).toBeTruthy();

    rerender(
      <FormView<DemoForm>
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Fetched' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => <NameField />}
      </FormView>
    );

    expect(screen.getByDisplayValue('Fetched')).toBeTruthy();
  });

  it('renders the error view and retries via onRetryButtonPress', async () => {
    const user = userEvent.setup();
    const onRetryButtonPress = jest.fn();

    render(
      <FormView<DemoForm>
        variant={{ type: 'error', onRetryButtonPress }}
        defaultValues={{ name: '' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => <NameField />}
      </FormView>
    );

    expect(screen.getByText('Failed to Fetch Demo')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryButtonPress).toHaveBeenCalled();
  });

  it("surfaces the resolver's error message on invalid submit, and calls onSubmit with parsed values once valid", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <FormView<DemoForm>
        variant={{ type: 'loaded' }}
        defaultValues={{ name: '' }}
        resolver={demoFormResolver}
        onSubmit={onSubmit}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {(form) => (
          <>
            <NameField />
            <Button onPress={form.handleSubmit(onSubmit)}>Submit</Button>
          </>
        )}
      </FormView>
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => {
      await flushPromises();
    });

    expect(
      screen.getByText('String must contain at least 1 character(s)')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByRole('textbox'), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => {
      await flushPromises();
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' }, expect.anything());
  });

  it('does not reset user edits when a loaded -> loaded rerender passes a new defaultValues reference', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <FormView<DemoForm>
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Original' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => <NameField />}
      </FormView>
    );

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Edited by user');

    // A brand-new object reference with the same shape, as happens on every
    // parent re-render - must not remount `LoadedForm` or reset the field.
    rerender(
      <FormView<DemoForm>
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Original' }}
        resolver={demoFormResolver}
        onSubmit={jest.fn()}
        loadingTitle="Fetching Demo..."
        errorTitle="Failed to Fetch Demo"
      >
        {() => <NameField />}
      </FormView>
    );

    expect(screen.getByDisplayValue('Edited by user')).toBeTruthy();
  });
});
