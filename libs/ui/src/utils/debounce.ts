export function createDebounce() {
  let timeout: NodeJS.Timeout;

  function debounce(callback: () => void, delay: number) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
    return timeout;
  }

  return debounce;
}
