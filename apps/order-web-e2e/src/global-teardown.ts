import { disposeApiContext } from './utils/api';

export default async function globalTeardown() {
  await disposeApiContext();
}
