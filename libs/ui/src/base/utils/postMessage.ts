import { useCallback, useEffect } from 'react';

export type PostMessageEvent =
  | { type: 'TransactionPayConfirmation'; transactionId: number }
  | { type: 'TransactionPaySuccess' }
  | { type: 'TransactionDeleteConfirmation'; transactionId: number }
  | { type: 'TransactionDeleteSuccess' }
  | { type: 'CategoryDeleteConfirmation'; categoryId: number }
  | { type: 'CategoryDeleteSuccess' };

export const usePostMessage = (
  onReceiveMessage?: (event: PostMessageEvent) => void
) => {
  const handleReceiveMessage = useCallback(
    (event: MessageEvent) => {
      if (onReceiveMessage) onReceiveMessage(event.data);
    },
    [onReceiveMessage]
  );

  useEffect(() => {
    window.addEventListener('message', handleReceiveMessage);
    return () => window.removeEventListener('message', handleReceiveMessage);
  }, [handleReceiveMessage]);

  const postMessage = (event: PostMessageEvent) => {
    window.postMessage(event);
  };

  return { postMessage };
};
