import { toSerializableProps } from './toSerializableProps';

describe('toSerializableProps', () => {
  it('drops undefined fields so the result matches JSON.parse(JSON.stringify(...))', () => {
    const result = toSerializableProps({
      id: 1,
      name: 'Pancong',
      availableQuantity: undefined,
      sellableQuantity: 5,
    });

    expect(result).toEqual({ id: 1, name: 'Pancong', sellableQuantity: 5 });
    expect('availableQuantity' in result).toBe(false);
  });

  it('drops undefined fields nested inside arrays', () => {
    const result = toSerializableProps({
      products: [
        { id: 1, sellableQuantity: undefined },
        { id: 2, sellableQuantity: 3 },
      ],
    });

    expect(result).toEqual({
      products: [{ id: 1 }, { id: 2, sellableQuantity: 3 }],
    });
  });

  it('leaves null values intact', () => {
    const result = toSerializableProps({ deletedAt: null });

    expect(result).toEqual({ deletedAt: null });
  });
});
