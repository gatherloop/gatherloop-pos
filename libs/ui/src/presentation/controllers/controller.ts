import { Dispatch, useEffect, useReducer } from 'react';
import { Usecase } from '../../domain';

export type Controller<State, Action> = {
  state: State;
  dispatch: Dispatch<Action>;
};

export const useController = <State, Action, Params>(
  usecase: Usecase<State, Action, Params>
): Controller<State, Action> => {
  const [state, dispatch] = useReducer(
    usecase.getNextState,
    usecase.getInitialState()
  );

  useEffect(() => {
    usecase.onStateChange(state, dispatch);
  }, [state, usecase]);

  return { state, dispatch };
};
