import { Usecase } from '../domain';

export class UsecaseTester<
  UsecaseScenario extends Usecase<State, Action, Params>,
  State,
  Action,
  Params
> {
  usecase: UsecaseScenario;
  state: State;

  constructor(usecase: UsecaseScenario) {
    this.usecase = usecase;
    this.state = this.usecase.getInitialState();
    this.usecase.onStateChange(this.state, this.dispatch);
  }

  dispatch = (action: Action) => {
    this.state = this.usecase.getNextState(this.state, action);
    this.usecase.onStateChange(this.state, this.dispatch);
  };
}
