export abstract class Usecase<State, Action, Params = undefined> {
  abstract params: Params;

  abstract getInitialState(): State;

  abstract getNextState(state: State, action: Action): State;

  abstract onStateChange(
    state: State,
    dispatch: (action: Action) => void
  ): void;
}
