type EventHandler = (...args: unknown[]) => void;

const listenersByType: Record<string, EventHandler[]> = {};

const events = {
  on: (type: string, handler: EventHandler) => {
    (listenersByType[type] ||= []).push(handler);
  },
  off: (type: string, handler: EventHandler) => {
    listenersByType[type] = (listenersByType[type] || []).filter(
      (listener) => listener !== handler
    );
  },
  emit: (type: string, ...args: unknown[]) => {
    (listenersByType[type] || []).slice().forEach((handler) => {
      handler(...args);
    });
  },
};

const Router = {
  replace: jest.fn(),
  push: jest.fn(),
  beforePopState: jest.fn(),
  pathname: '/',
  asPath: '/',
  query: {},
  events,
};

export default Router;
