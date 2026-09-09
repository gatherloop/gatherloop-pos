import { Dispatch, useEffect, useReducer } from 'react';
import { Usecase } from '../../../domain';

export type UsecaseBinding<State, Action> = {
  state: State;
  dispatch: Dispatch<Action>;
};

export const useUsecase = <State, Action, Params>(
  usecase: Usecase<State, Action, Params>
): UsecaseBinding<State, Action> => {
  const [state, dispatch] = useReducer(
    usecase.getNextState,
    usecase.getInitialState()
  );

  useEffect(() => {
    usecase.onStateChange(state, dispatch);
  }, [state, usecase]);

  return { state, dispatch };
};
