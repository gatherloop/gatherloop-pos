import { match, P } from 'ts-pattern';
import { ChecklistTemplate } from '../entities';
import { ChecklistTemplateRepository } from '../repositories';
import { createDebounce } from '../../utils/debounce';
import { Usecase } from './IUsecase';

type Context = {
  checklistTemplates: ChecklistTemplate[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type ChecklistTemplateListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type ChecklistTemplateListAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      checklistTemplates: ChecklistTemplate[];
      totalItem: number;
    }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | {
      type: 'REVALIDATE';
      checklistTemplates: ChecklistTemplate[];
      totalItem: number;
    }
  | {
      type: 'REVALIDATE_FINISH';
      checklistTemplates: ChecklistTemplate[];
      totalItem: number;
    };

const changeParamsDebounce = createDebounce();

export type ChecklistTemplateListParams = {
  checklistTemplates: ChecklistTemplate[];
  totalItem: number;
  page?: number;
  query?: string;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
};

export class ChecklistTemplateListUsecase extends Usecase<
  ChecklistTemplateListState,
  ChecklistTemplateListAction,
  ChecklistTemplateListParams
> {
  params: ChecklistTemplateListParams;
  checklistTemplateRepository: ChecklistTemplateRepository;

  constructor(
    checklistTemplateRepository: ChecklistTemplateRepository,
    params: ChecklistTemplateListParams
  ) {
    super();
    this.checklistTemplateRepository = checklistTemplateRepository;
    this.params = params;
  }

  getInitialState() {
    const state: ChecklistTemplateListState = {
      type: this.params.checklistTemplates.length >= 1 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page ?? 1,
      query: this.params.query ?? '',
      errorMessage: null,
      sortBy: this.params.sortBy ?? 'created_at',
      orderBy: this.params.orderBy ?? 'asc',
      itemPerPage: this.params.itemPerPage ?? 10,
      fetchDebounceDelay: 0,
      checklistTemplates: this.params.checklistTemplates,
    };

    return state;
  }

  getNextState(
    state: ChecklistTemplateListState,
    action: ChecklistTemplateListAction
  ) {
    return match([state, action])
      .returnType<ChecklistTemplateListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { checklistTemplates, totalItem }]) => ({
          ...state,
          type: 'loaded',
          errorMessage: null,
          checklistTemplates,
          totalItem,
        })
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
          { type: 'CHANGE_PARAMS' },
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
        ([state, { checklistTemplates, totalItem }]) => ({
          ...state,
          checklistTemplates,
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
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistTemplateListState,
    dispatch: (action: ChecklistTemplateListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.checklistTemplateRepository
            .fetchChecklistTemplateList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ checklistTemplates, totalItem }) =>
              dispatch({
                type: 'FETCH_SUCCESS',
                checklistTemplates,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch checklist templates',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { checklistTemplates, totalItem } =
              this.checklistTemplateRepository.getChecklistTemplateList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
              });

            if (checklistTemplates.length > 0) {
              dispatch({
                type: 'REVALIDATE',
                checklistTemplates,
                totalItem,
              });
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
          checklistTemplates,
          totalItem,
        }) => {
          this.checklistTemplateRepository
            .fetchChecklistTemplateList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ checklistTemplates, totalItem }) =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                checklistTemplates,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                checklistTemplates,
                totalItem,
              })
            );
        }
      )
      .otherwise(() => {
        // noop
      });
  }
}
