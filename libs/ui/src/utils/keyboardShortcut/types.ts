export type ShortcutMap = {
  ctrl?: Record<string, () => void>;
  alt?: Record<string, () => void>;
  shift?: Record<string, () => void>;
};
