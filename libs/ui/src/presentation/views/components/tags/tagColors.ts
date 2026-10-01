import { TagColor } from '../../../../domain';

export const tagColorLabels: Record<TagColor, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
  gray: 'Gray',
};

export const tagColorBackground = (color: TagColor) => `$${color}5` as const;
export const tagColorForeground = (color: TagColor) => `$${color}11` as const;
