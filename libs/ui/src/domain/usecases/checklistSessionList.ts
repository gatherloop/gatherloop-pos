import { match, P } from 'ts-pattern';
import { ChecklistSession } from '../entities';
import { ChecklistSessionListFilter, ChecklistSessionRepository } from '../repositories';
import { createDebounce } from '../../utils/debounce';
import { Usecase } from './IUsecase';

type Context = {
  checklistSessions: ChecklistSession[];
  page: number;
  filter: ChecklistSessionListFilter;
  errorMessage: string | null;
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type ChecklistSessionListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type ChecklistSessionListAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      checklistSessions: ChecklistSession[];
      totalItem: number;
    }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      filter?: ChecklistSessionListFilter;
      fetchDebounceDelay?: number;
    }
  | {
      type: 'REVALIDATE';
      checklistSessions: ChecklistSession[];
      totalItem: number;
    }
  | {
      type: 'REVALIDATE_FINISH';
      checklistSessions: ChecklistSession[];
      totalItem: number;
    };

const changeParamsDebounce = createDebounce();

export type ChecklistSessionListParams = {
  checklistSessions: ChecklistSession[];
  totalItem: number;
  page?: number;
  filter?: ChecklistSessionListFilter;
  itemPerPage?: number;
};

export class ChecklistSessionListUsecase extends Usecase<
  ChecklistSessionListState,
  ChecklistSessionListAction,
  ChecklistSessionListParams
> {
  params: ChecklistSessionListParams;
  checklistSessionRepository: ChecklistSessionRepository;

  constructor(
    checklistSessionRepository: ChecklistSessionRepository,
    params: ChecklistSessionListParams
  ) {
    super();
    this.checklistSessionRepository = checklistSessionRepository;
    this.params = params;
  }

  getInitialState() {
    const state: ChecklistSessionListState = {
      type: this.params.checklistSessions.length >= 1 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page ?? 1,
      filter: this.params.filter ?? {},
      errorMessage: null,
      itemPerPage: this.params.itemPerPage ?? 10,
      fetchDebounceDelay: 0,
      checklistSessions: this.params.checklistSessions,
    };

    return state;
  }

  getNextState(
    state: ChecklistSessionListState,
    action: ChecklistSessionListAction
  ) {
    return match([state, action])
      .returnType<ChecklistSessionListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { checklistSessions, totalItem }]) => ({
          ...state,
          type: 'loaded',
          errorMessage: null,
          checklistSessions,
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
          filter: { ...state.filter, ...params.filter },
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
        ([state, { checklistSessions, totalItem }]) => ({
          ...state,
          checklistSessions,
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
    state: ChecklistSessionListState,
    dispatch: (action: ChecklistSessionListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, filter }) =>
          this.checklistSessionRepository
            .fetchChecklistSessionList({
              page,
              itemPerPage,
              filter,
            })
            .then(({ checklistSessions, totalItem }) =>
              dispatch({
                type: 'FETCH_SUCCESS',
                checklistSessions,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch checklist sessions',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, filter, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { checklistSessions, totalItem } =
              this.checklistSessionRepository.getChecklistSessionList({
                page,
                itemPerPage,
                filter,
              });

            if (checklistSessions.length > 0) {
              dispatch({
                type: 'REVALIDATE',
                checklistSessions,
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
          filter,
          checklistSessions,
          totalItem,
        }) => {
          this.checklistSessionRepository
            .fetchChecklistSessionList({
              page,
              itemPerPage,
              filter,
            })
            .then(({ checklistSessions, totalItem }) =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                checklistSessions,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                checklistSessions,
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
