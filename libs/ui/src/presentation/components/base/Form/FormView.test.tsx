import { MutableRefObject, useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from 'tamagui';
import { FormView, FormVariant } from './FormView';
import { Field } from './Field';
import { InputText } from './InputText';
import { FormErrorBanner } from './FormErrorBanner';

type Values = { name: string };

const schema = z.object({ name: z.string().min(1, 'Name is required') });
const resolver = zodResolver(schema);

const Harness = ({
  variant,
  defaultValues,
  onSubmit,
  formRef,
}: {
  variant: FormVariant;
  defaultValues: Values;
  onSubmit: (values: Values) => void;
  formRef?: MutableRefObject<UseFormReturn<Values> | null>;
}) => (
  <FormView
    variant={variant}
    defaultValues={defaultValues}
    resolver={resolver}
    onSubmit={onSubmit}
    loadingTitle="Loading..."
    errorTitle="Failed to load"
    formRef={formRef}
  >
    {(form) => (
      <>
        <FormErrorBanner message={undefined} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Button onPress={form.handleSubmit(onSubmit)}>Submit</Button>
      </>
    )}
  </FormView>
);

describe('FormView', () => {
  it('renders the loading title while loading', () => {
    render(
      <Harness
        variant={{ type: 'loading' }}
        defaultValues={{ name: '' }}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders the error view with a retry button', async () => {
    const onRetryButtonPress = jest.fn();
    const user = userEvent.setup();
    render(
      <Harness
        variant={{ type: 'error', onRetryButtonPress }}
        defaultValues={{ name: '' }}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText('Failed to load')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryButtonPress).toHaveBeenCalled();
  });

  // The executable statement of the bug this primitive fixes: a form mounted
  // before its data exists must not be stuck with the blank it was born with.
  it('mounts the form with the fetched defaultValues once the loading branch is replaced by loaded', () => {
    const { rerender } = render(
      <Harness
        variant={{ type: 'loading' }}
        defaultValues={{ name: '' }}
        onSubmit={jest.fn()}
      />
    );

    rerender(
      <Harness
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Fetched' }}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('Fetched')).toBeTruthy();
  });

  it('does not reset user edits when defaultValues gets a fresh reference on a loaded → loaded rerender', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Harness
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Original' }}
        onSubmit={jest.fn()}
      />
    );

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Edited by user');

    rerender(
      <Harness
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Original' }}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('Edited by user')).toBeTruthy();
  });

  it('surfaces the resolver error and does not call onSubmit for invalid values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <Harness
        variant={{ type: 'loaded' }}
        defaultValues={{ name: '' }}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the parsed values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <Harness
        variant={{ type: 'loaded' }}
        defaultValues={{ name: 'Alice' }}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.anything()
    );
  });

  describe('formRef', () => {
    const FormRefHarness = ({ variant }: { variant: FormVariant }) => {
      const formRef = useRef<UseFormReturn<Values> | null>(null);
      return (
        <>
          <Harness
            variant={variant}
            defaultValues={{ name: 'Alice' }}
            onSubmit={jest.fn()}
            formRef={formRef}
          />
          <Button
            onPress={() => formRef.current?.setValue('name', 'Set via ref')}
          >
            Set via ref
          </Button>
        </>
      );
    };

    it('is null while loading', () => {
      render(<FormRefHarness variant={{ type: 'loading' }} />);

      // No throw / no-op when the sibling writer fires before the form mounts.
      const button = screen.getByRole('button', { name: 'Set via ref' });
      expect(() => button.click()).not.toThrow();
    });

    it('is populated once the form is loaded, letting a sibling write through it', async () => {
      const user = userEvent.setup();
      render(<FormRefHarness variant={{ type: 'loaded' }} />);

      await user.click(screen.getByRole('button', { name: 'Set via ref' }));

      expect(screen.getByDisplayValue('Set via ref')).toBeTruthy();
    });
  });
});
