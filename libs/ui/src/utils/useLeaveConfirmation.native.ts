export type UseLeaveConfirmationResult = {
  isConfirmOpen: boolean;
  onLeaveConfirm: () => void;
  onLeaveCancel: () => void;
};

export function useLeaveConfirmation(
  isEnabled: boolean
): UseLeaveConfirmationResult {
  return {
    isConfirmOpen: false,
    onLeaveConfirm: () => {
      // no-op: Metro build has no browser navigation to guard
    },
    onLeaveCancel: () => {
      // no-op: Metro build has no browser navigation to guard
    },
  };
}
