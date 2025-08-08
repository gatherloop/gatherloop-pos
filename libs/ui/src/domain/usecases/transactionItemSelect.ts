import { match, P } from 'ts-pattern';
import { OptionValue, Product, Variant } from '../entities';
import { ProductRepository, VariantRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type SortBy = 'created_at';

type OrderBy = 'asc' | 'desc';

type Context = {
  products: Product[];
  selectedProduct?: Product;
  selectedOptionValues: OptionValue[];
  selectedVariant?: Variant;
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: SortBy;
  orderBy: OrderBy;
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type TransactionItemSelectState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
  | { type: 'selectingOptions' }
  | { type: 'loadingVariant' }
  | { type: 'loadingVariantSuccess' }
) &
  Context;

export type TransactionItemSelectAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; products: Product[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; products: Product[]; totalItem: number }
  | { type: 'SELECT_PRODUCT'; product: Product }
  | { type: 'UNSELECT_PRODUCT' }
  | { type: 'UPDATE_OPTION_VALUES'; optionValues: OptionValue[] }
  | { type: 'FETCH_VARIANT' }
  | { type: 'FETCH_VARIANT_ERROR' }
  | { type: 'FETCH_VARIANT_SUCCESS'; variant: Variant }
  | { type: 'RESET' };

export type TransactionItemSelectParams = {
  products: Product[];
  totalItem: number;
  page?: number;
  query?: string;
  sortBy?: SortBy;
  orderBy?: OrderBy;
  itemPerPage?: number;
};

const changeParamsDebounce = createDebounce();

export class TransactionItemSelectUsecase extends Usecase<
  TransactionItemSelectState,
  TransactionItemSelectAction,
  TransactionItemSelectParams
> {
  productRepository: ProductRepository;
  variantRepository: VariantRepository;
  params: TransactionItemSelectParams;

  constructor(
    productRepository: ProductRepository,
    variantRepository: VariantRepository,
    params: TransactionItemSelectParams
  ) {
    super();
    this.productRepository = productRepository;
    this.variantRepository = variantRepository;
    this.params = params;
  }

  getInitialState(): TransactionItemSelectState {
    const page = this.params.page ?? 1;
    const itemPerPage = this.params.itemPerPage ?? 100;
    const query = this.params.query ?? '';
    const sortBy = this.params.sortBy ?? 'created_at';
    const orderBy = this.params.orderBy ?? 'desc';

    return {
      type: this.params.products.length >= 1 ? 'loaded' : 'idle',
      products: this.params.products,
      selectedProduct: undefined,
      selectedOptionValues: [],
      selectedVariant: undefined,
      totalItem: this.params.totalItem,
      page,
      query,
      errorMessage: null,
      sortBy,
      orderBy,
      itemPerPage,
      fetchDebounceDelay: 0,
    };
  }

  getNextState(
    state: TransactionItemSelectState,
    action: TransactionItemSelectAction
  ) {
    return match([state, action])
      .returnType<TransactionItemSelectState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { products, totalItem }]) => ({
          ...state,
          type: 'loaded',
          products,
          totalItem,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [
          {
            type: P.union(
              'loaded',
              'changingParams',
              'loading',
              'error',
              'revalidating'
            ),
          },
          { type: P.union('CHANGE_PARAMS') },
        ],
        ([state, { type: _type, fetchDebounceDelay = 0, ...params }]) => ({
          ...state,
          ...params,
          fetchDebounceDelay,
          type: 'changingParams',
        })
      )
      .with([{ type: 'changingParams' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'changingParams' }, { type: 'REVALIDATE' }],
        ([state, { products, totalItem }]) => ({
          ...state,
          products,
          totalItem,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SELECT_PRODUCT' }],
        ([state, { product }]) => ({
          ...state,
          type: 'selectingOptions',
          selectedProduct: product,
        })
      )
      .with(
        [{ type: 'selectingOptions' }, { type: 'UNSELECT_PRODUCT' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
          selectedProduct: undefined,
          selectedOptionValues: [],
        })
      )
      .with(
        [{ type: 'selectingOptions' }, { type: 'UPDATE_OPTION_VALUES' }],
        ([state, { optionValues }]) => ({
          ...state,
          selectedOptionValues: optionValues,
        })
      )
      .with(
        [{ type: 'selectingOptions' }, { type: 'FETCH_VARIANT' }],
        ([state]) => ({
          ...state,
          type: 'loadingVariant',
        })
      )
      .with(
        [{ type: 'loadingVariant' }, { type: 'FETCH_VARIANT_ERROR' }],
        ([state]) => ({
          ...state,
          type: 'selectingOptions',
        })
      )
      .with(
        [{ type: 'loadingVariant' }, { type: 'FETCH_VARIANT_SUCCESS' }],
        ([state, { variant }]) => ({
          ...state,
          type: 'loadingVariantSuccess',
          selectedVariant: variant,
        })
      )
      .with(
        [{ type: 'loadingVariantSuccess' }, { type: 'RESET' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
          selectedProduct: undefined,
          selectedOptionValues: [],
          selectedVariant: undefined,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionItemSelectState,
    dispatch: (action: TransactionItemSelectAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.productRepository
            .fetchProductList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ products, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', products, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch products',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { products, totalItem } =
              this.productRepository.getProductList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
              });

            if (products.length > 0) {
              dispatch({ type: 'REVALIDATE', products, totalItem });
            } else {
              dispatch({ type: 'FETCH' });
            }
          }, fetchDebounceDelay);
        }
      )
      .with(
        { type: 'revalidating' },
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          products,
          totalItem,
        }) => {
          this.productRepository
            .fetchProductList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ products, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', products, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', products, totalItem })
            );
        }
      )
      .with(
        { type: 'loadingVariant' },
        ({ selectedProduct, selectedOptionValues }) => {
          if (selectedProduct && selectedOptionValues.length > 1)
            this.variantRepository
              .fetchVariantList({
                page: 1,
                itemPerPage: 1,
                orderBy: 'desc',
                query: '',
                sortBy: 'created_at',
                productId: selectedProduct.id,
                optionValueIds: selectedOptionValues.map(({ id }) => id),
              })
              .then((result) => {
                if (result.variants.length > 0) {
                  dispatch({
                    type: 'FETCH_VARIANT_SUCCESS',
                    variant: result.variants[0],
                  });
                } else {
                  dispatch({ type: 'FETCH_VARIANT_ERROR' });
                }
              })
              .catch(() => {
                dispatch({ type: 'FETCH_VARIANT_ERROR' });
              });
        }
      )
      .with(
        {
          type: 'loadingVariantSuccess',
        },
        () => {
          dispatch({ type: 'RESET' });
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
