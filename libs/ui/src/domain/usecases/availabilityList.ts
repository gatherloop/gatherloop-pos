import { match, P } from 'ts-pattern';
import { AvailabilityProduct } from '../entities';
import { AvailabilityRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  products: AvailabilityProduct[];
  errorMessage: string | null;
};

export type AvailabilityListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type AvailabilityListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: AvailabilityProduct[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE_FINISH'; products: AvailabilityProduct[] };

export type AvailabilityListParams = {
  products: AvailabilityProduct[];
};

export class AvailabilityListUsecase extends Usecase<
  AvailabilityListState,
  AvailabilityListAction,
  AvailabilityListParams
> {
  params: AvailabilityListParams;
  repository: AvailabilityRepository;

  constructor(repository: AvailabilityRepository, params: AvailabilityListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): AvailabilityListState {
    return {
      type: this.params.products.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      products: this.params.products,
    };
  }

  getNextState(
    state: AvailabilityListState,
    action: AvailabilityListAction
  ): AvailabilityListState {
    return match([state, action])
      .returnType<AvailabilityListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { products }]) => ({ ...state, type: 'loaded', products })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { products }]) => ({ ...state, type: 'loaded', products })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: AvailabilityListState,
    dispatch: (action: AvailabilityListAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchAvailabilityList()
          .then((products) => dispatch({ type: 'FETCH_SUCCESS', products }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch availability',
            })
          );
      })
      .with({ type: 'revalidating' }, ({ products }) => {
        this.repository
          .fetchAvailabilityList()
          .then((products) => dispatch({ type: 'REVALIDATE_FINISH', products }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', products }));
      })
      .otherwise(() => {
        // noop
      });
  }
}
