/**
 * Shared test utilities for handler integration tests.
 *
 * Usage pattern:
 *   1. Create mock repos
 *   2. Create real usecases with mock repos
 *   3. Pass usecases as props to Handler
 *   4. render(<Handler {...usecaseProps} />)
 *   5. Use act() + flushPromises() for async state transitions
 *   6. Assert UI text, navigation calls, toast calls
 */

/**
 * Flushes all pending promises (microtasks and macrotasks).
 * Use inside `await act(async () => { await flushPromises(); })` to
 * wait for async usecase state transitions to complete.
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
