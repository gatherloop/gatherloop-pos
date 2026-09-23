import {
  formatWhatsappNumberForInput,
  normalizeWhatsappNumber,
} from './Customer';

describe('normalizeWhatsappNumber', () => {
  const cases: {
    name: string;
    raw: string;
    expected: string | null;
  }[] = [
    { name: 'leading 0 becomes 62', raw: '0812-3456-7890', expected: '6281234567890' },
    { name: '628 prefix is unchanged', raw: '6281234567890', expected: '6281234567890' },
    { name: '+628 drops the plus', raw: '+62 812 3456 7890', expected: '6281234567890' },
    { name: 'other country plus is dropped, kept if 8-15 digits', raw: '+6591234567', expected: '6591234567' },
    { name: 'dots and parentheses are stripped', raw: '(0812).3456.7890', expected: '6281234567890' },
    { name: 'too short to be a number', raw: '12345', expected: null },
    { name: 'letters are rejected', raw: 'abc', expected: null },
    { name: 'empty string is rejected', raw: '', expected: null },
    { name: '62 landline is rejected, not a mobile prefix', raw: '+62 21 555 1234', expected: null },
    { name: '0 landline is rejected, not a mobile prefix', raw: '021-555-1234', expected: null },
    { name: '62 number under 10 digits is rejected', raw: '62812345', expected: null },
    { name: '62 number over 15 digits is rejected', raw: '6281234567890123', expected: null },
    { name: '62 number at the 10 digit floor is accepted', raw: '6281234567', expected: '6281234567' },
    { name: '62 number at the 15 digit ceiling is accepted', raw: '628123456789012', expected: '628123456789012' },
    { name: 'non-62 number under 8 digits is rejected', raw: '+1234567', expected: null },
    { name: 'non-62 number at the 8 digit floor is accepted', raw: '+12345678', expected: '12345678' },
    { name: 'non-62 number at the 15 digit ceiling is accepted', raw: '+123456789012345', expected: '123456789012345' },
    { name: 'non-62 number over 15 digits is rejected', raw: '+1234567890123456', expected: null },
    { name: 'bare plus sign is rejected', raw: '+', expected: null },
  ];

  it.each(cases)('$name', ({ raw, expected }) => {
    expect(normalizeWhatsappNumber(raw)).toBe(expected);
  });
});

describe('formatWhatsappNumberForInput', () => {
  it('shows an Indonesian number in local form', () => {
    expect(formatWhatsappNumberForInput('6281234567890')).toBe('081234567890');
  });

  it('leaves a non-Indonesian number unchanged', () => {
    expect(formatWhatsappNumberForInput('6591234567')).toBe('6591234567');
  });

  it('leaves an empty string unchanged', () => {
    expect(formatWhatsappNumberForInput('')).toBe('');
  });
});
