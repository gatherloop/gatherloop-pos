export function createStringUnionParser<const T extends readonly string[]>(
  values: T
) {
  const valueSet = new Set(values);
  type Union = T[number];

  return (input: string): Union | undefined => {
    return valueSet.has(input) ? (input as Union) : undefined;
  };
}