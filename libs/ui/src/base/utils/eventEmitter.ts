import { useEffect } from 'react';
import EventEmitter from 'eventemitter3';

const eventEmitter = new EventEmitter();

export type Event =
  | { type: 'TransactionPayConfirmation'; transactionId: number }
  | { type: 'TransactionPaySuccess' }
  | { type: 'TransactionDeleteConfirmation'; transactionId: number }
  | { type: 'TransactionDeleteSuccess' }
  | { type: 'CategoryDeleteConfirmation'; categoryId: number }
  | { type: 'CategoryDeleteSuccess' }
  | { type: 'MaterialDeleteConfirmation'; materialId: number }
  | { type: 'MaterialDeleteSuccess' }
  | { type: 'ProductDeleteConfirmation'; productId: number }
  | { type: 'ProductDeleteSuccess' }
  | { type: 'ExpenseDeleteConfirmation'; expenseId: number }
  | { type: 'ExpenseDeleteSuccess' };

export type Listener<T> = T extends Event['type']
  ? {
      type: T;
      callback: (event: Extract<Event, { type: T }>) => void;
    }
  : never;

export const useEventEmitter = <T extends Event['type']>(
  listeners?: Listener<T>[]
) => {
  useEffect(() => {
    if (listeners === undefined || listeners.length === 0) return;

    listeners.forEach((listener) => {
      eventEmitter.on(listener.type, listener.callback);
    });

    return () => {
      listeners.forEach((listener) => {
        eventEmitter.removeListener(listener.type, listener.callback);
      });
    };
  }, [listeners]);

  const emit = (event: Event) => {
    eventEmitter.emit(event.type, event);
  };

  return { emit };
};
