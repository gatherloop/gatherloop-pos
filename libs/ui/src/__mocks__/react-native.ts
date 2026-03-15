export const Platform = {
  OS: 'web',
  select: jest.fn((obj: Record<string, unknown>) => obj.web ?? obj.default),
};
