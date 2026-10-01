import { match, P } from 'ts-pattern';
import { Tag, Variant } from '../entities';
import { TagRepository, VariantRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tag: Tag | null;
  variants: Variant[];
  selectedVariantIds: number[];
  query: string;
  errorMessage: string | null;
};

export type TagAssignmentState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'saving' }
  | { type: 'saveSuccess' }
  | { type: 'saveError' }
) &
  Context;

export type TagAssignmentAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; tag: Tag; variants: Variant[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SEARCH'; query: string }
  | { type: 'TOGGLE_VARIANT'; variantId: number }
  | { type: 'TOGGLE_PRODUCT'; productId: number }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; errorMessage: string };

export type TagAssignmentParams = {
  tagId: number;
};

const toggleVariantIds = (selectedVariantIds: number[], variantId: number) =>
  selectedVariantIds.includes(variantId)
    ? selectedVariantIds.filter((id) => id !== variantId)
    : [...selectedVariantIds, variantId];

const toggleProductVariantIds = (
  state: TagAssignmentState,
  productId: number
) => {
  const productVariantIds = state.variants
    .filter((variant) => variant.product.id === productId)
    .map((variant) => variant.id);
  const isEveryVariantSelected =
    productVariantIds.length > 0 &&
    productVariantIds.every((id) => state.selectedVariantIds.includes(id));
  const otherVariantIds = state.selectedVariantIds.filter(
    (id) => !productVariantIds.includes(id)
  );
  return isEveryVariantSelected
    ? otherVariantIds
    : [...otherVariantIds, ...productVariantIds];
};

export class TagAssignmentUsecase extends Usecase<
  TagAssignmentState,
  TagAssignmentAction,
  TagAssignmentParams
> {
  params: TagAssignmentParams;
  tagRepository: TagRepository;
  variantRepository: VariantRepository;

  constructor(
    tagRepository: TagRepository,
    variantRepository: VariantRepository,
    params: TagAssignmentParams
  ) {
    super();
    this.tagRepository = tagRepository;
    this.variantRepository = variantRepository;
    this.params = params;
  }

  getInitialState(): TagAssignmentState {
    return {
      type: 'idle',
      tag: null,
      variants: [],
      selectedVariantIds: [],
      query: '',
      errorMessage: null,
    };
  }

  getNextState(
    state: TagAssignmentState,
    action: TagAssignmentAction
  ): TagAssignmentState {
    return match([state, action])
      .returnType<TagAssignmentState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { tag, variants }]) => ({
          ...state,
          type: 'loaded',
          tag,
          variants,
          selectedVariantIds: variants
            .filter((variant) =>
              (variant.tags ?? []).some(
                (variantTag) => variantTag.tag.id === tag.id
              )
            )
            .map((variant) => variant.id),
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with(
        [{ type: P.union('loaded', 'saveError') }, { type: 'SEARCH' }],
        ([state, { query }]) => ({ ...state, query })
      )
      .with(
        [{ type: P.union('loaded', 'saveError') }, { type: 'TOGGLE_VARIANT' }],
        ([state, { variantId }]) => ({
          ...state,
          selectedVariantIds: toggleVariantIds(
            state.selectedVariantIds,
            variantId
          ),
        })
      )
      .with(
        [{ type: P.union('loaded', 'saveError') }, { type: 'TOGGLE_PRODUCT' }],
        ([state, { productId }]) => ({
          ...state,
          selectedVariantIds: toggleProductVariantIds(state, productId),
        })
      )
      .with(
        [{ type: P.union('loaded', 'saveError') }, { type: 'SAVE' }],
        ([state]) => ({ ...state, type: 'saving', errorMessage: null })
      )
      .with([{ type: 'saving' }, { type: 'SAVE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'saveSuccess',
      }))
      .with(
        [{ type: 'saving' }, { type: 'SAVE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'saveError',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TagAssignmentState,
    dispatch: (action: TagAssignmentAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.tagRepository.fetchTagById(this.params.tagId),
          this.variantRepository.fetchVariantList({
            page: 1,
            itemPerPage: 1000,
            query: '',
            sortBy: 'created_at',
            orderBy: 'asc',
            optionValueIds: [],
          }),
        ])
          .then(([tag, { variants }]) =>
            dispatch({ type: 'FETCH_SUCCESS', tag, variants })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch tag assignments',
            })
          );
      })
      .with({ type: 'saving' }, ({ selectedVariantIds }) => {
        this.tagRepository
          .setTagVariants(this.params.tagId, selectedVariantIds)
          .then(() => dispatch({ type: 'SAVE_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SAVE_ERROR', errorMessage: 'Save failed' })
          );
      })
      .otherwise(() => undefined);
  }
}
