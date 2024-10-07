import { match } from 'ts-pattern';
import { ProductRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  productId: number | null;
};

export type ProductDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
) &
  Context;

export type ProductDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; productId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' };

export class ProductDeleteUsecase extends Usecase<
  ProductDeleteState,
  ProductDeleteAction
> {
  repository: ProductRepository;

  constructor(repository: ProductRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ProductDeleteState {
    return {
      type: 'hidden',
      productId: null,
    };
  }
  getNextState(
    state: ProductDeleteState,
    action: ProductDeleteAction
  ): ProductDeleteState {
    return match([state, action])
      .returnType<ProductDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { productId }]) => ({ type: 'shown', productId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        type: 'hidden',
        productId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_ERROR' }], ([state]) => ({
        ...state,
        type: 'shown',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'deletingSuccess',
      }))
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          productId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: ProductDeleteState,
    dispatch: (action: ProductDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ productId }) => {
        this.repository
          .deleteProductById(productId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
