import { match, P } from 'ts-pattern';
import { Payment } from '../entities';
import { PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

const NAME_MAX_LENGTH = 60;

type Context = {
  payment: Payment | null;
  customerName: string;
  nameErrorMessage: string | null;
  errorMessage: string | null;
};

export type CheckoutState = (
  | { type: 'idle' }
  | { type: 'askingName' }
  | { type: 'creatingPayment' }
  | { type: 'created' }
  | { type: 'error' }
) &
  Context;

export type CheckoutAction =
  | { type: 'ASK_NAME' }
  | { type: 'CHANGE_NAME'; name: string }
  | { type: 'CANCEL_NAME' }
  | { type: 'SUBMIT_NAME' }
  | { type: 'CHECKOUT_SUCCESS'; payment: Payment }
  | { type: 'CHECKOUT_ERROR'; message: string };

export type CheckoutParams = {
  customerName?: string;
};

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Nama tidak boleh kosong';
  if (trimmed.length > NAME_MAX_LENGTH) return 'Nama maksimal 60 karakter';
  return null;
}

export class CheckoutUsecase extends Usecase<
  CheckoutState,
  CheckoutAction,
  CheckoutParams
> {
  params: CheckoutParams;
  private paymentRepository: PaymentRepository;

  constructor(
    paymentRepository: PaymentRepository,
    params: CheckoutParams = {}
  ) {
    super();
    this.paymentRepository = paymentRepository;
    this.params = params;
  }

  getInitialState(): CheckoutState {
    return {
      type: 'idle',
      payment: null,
      customerName: this.params.customerName ?? '',
      nameErrorMessage: null,
      errorMessage: null,
    };
  }

  getNextState(state: CheckoutState, action: CheckoutAction): CheckoutState {
    return match([state, action])
      .returnType<CheckoutState>()
      .with([{ type: 'idle' }, { type: 'ASK_NAME' }], ([state]) => ({
        ...state,
        type: 'askingName',
        nameErrorMessage: null,
      }))
      .with(
        [{ type: 'askingName' }, { type: 'CHANGE_NAME' }],
        ([state, { name }]) => ({ ...state, customerName: name })
      )
      .with([{ type: 'askingName' }, { type: 'CANCEL_NAME' }], ([state]) => ({
        ...state,
        type: 'idle',
        nameErrorMessage: null,
      }))
      .with(
        [{ type: P.union('askingName', 'error') }, { type: 'SUBMIT_NAME' }],
        ([state]) => {
          const nameErrorMessage = validateName(state.customerName);
          if (nameErrorMessage) {
            return { ...state, type: 'askingName', nameErrorMessage };
          }
          return {
            ...state,
            type: 'creatingPayment',
            customerName: state.customerName.trim(),
            nameErrorMessage: null,
            errorMessage: null,
          };
        }
      )
      .with(
        [{ type: 'creatingPayment' }, { type: 'CHECKOUT_SUCCESS' }],
        ([state, { payment }]) => ({
          ...state,
          type: 'created',
          payment,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'creatingPayment' }, { type: 'CHECKOUT_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CheckoutState,
    dispatch: (action: CheckoutAction) => void
  ): void {
    match(state)
      .with({ type: 'creatingPayment' }, ({ customerName }) => {
        this.paymentRepository
          .checkout(customerName)
          .then((payment) => dispatch({ type: 'CHECKOUT_SUCCESS', payment }))
          .catch(() =>
            dispatch({
              type: 'CHECKOUT_ERROR',
              message: 'Failed to create payment',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
