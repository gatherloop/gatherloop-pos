import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { FieldWatch } from './FieldWatch';

type FormValues = { name: string };

describe('FieldWatch', () => {
  it('watches the field value using the explicitly passed control, without relying on an ambient FormProvider', () => {
    const Harness = () => {
      const form = useForm<FormValues>({ defaultValues: { name: 'Alice' } });
      return (
        <FieldWatch control={form.control} name={['name']}>
          {([name]) => <>{name}</>}
        </FieldWatch>
      );
    };

    render(<Harness />);

    expect(screen.getByText('Alice')).toBeTruthy();
  });
});
