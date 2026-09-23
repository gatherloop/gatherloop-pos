import { match, P } from 'ts-pattern';
import { normalizeWhatsappNumber, Payment, PaymentMethod } from '../entities';
import { PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

const NAME_MAX_LENGTH = 60;

type Context = {
  payment: Payment | null;
  customerName: string;
  whatsappNumber: string;
  method: PaymentMethod;
  nameErrorMessage: string | null;
  whatsappNumberErrorMessage: string | null;
  errorMessage: string | null;
};

export type CheckoutState = (
  | { type: 'idle' }
  | { type: 'askingDetails' }
  | { type: 'creatingPayment' }
  | { type: 'created' }
  | { type: 'error' }
) &
  Context;

export type CheckoutAction =
  | { type: 'ASK_DETAILS' }
  | { type: 'CHANGE_NAME'; name: string }
  | { type: 'CHANGE_WHATSAPP_NUMBER'; whatsappNumber: string }
  | { type: 'CHANGE_METHOD'; method: PaymentMethod }
  | { type: 'CANCEL_DETAILS' }
  | { type: 'SUBMIT_DETAILS' }
  | { type: 'CHECKOUT_SUCCESS'; payment: Payment }
  | { type: 'CHECKOUT_ERROR'; message: string };

export type CheckoutParams = {
  customerName?: string;
  customerWhatsappNumber?: string;
};

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Nama tidak boleh kosong';
  if (trimmed.length > NAME_MAX_LENGTH) return 'Nama maksimal 60 karakter';
  return null;
}

function validateWhatsappNumber(whatsappNumber: string): {
  errorMessage: string | null;
  normalized: string;
} {
  const trimmed = whatsappNumber.trim();
  if (trimmed.length === 0) {
    return { errorMessage: 'Nomor WhatsApp tidak boleh kosong', normalized: trimmed };
  }
  const normalized = normalizeWhatsappNumber(trimmed);
  if (normalized === null) {
    return { errorMessage: 'Nomor WhatsApp tidak valid', normalized: trimmed };
  }
  return { errorMessage: null, normalized };
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
      whatsappNumber: this.params.customerWhatsappNumber ?? '',
      method: 'qris',
      nameErrorMessage: null,
      whatsappNumberErrorMessage: null,
      errorMessage: null,
    };
  }

  getNextState(state: CheckoutState, action: CheckoutAction): CheckoutState {
    return match([state, action])
      .returnType<CheckoutState>()
      .with([{ type: 'idle' }, { type: 'ASK_DETAILS' }], ([state]) => ({
        ...state,
        type: 'askingDetails',
        nameErrorMessage: null,
        whatsappNumberErrorMessage: null,
      }))
      .with(
        [{ type: 'askingDetails' }, { type: 'CHANGE_NAME' }],
        ([state, { name }]) => ({ ...state, customerName: name })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CHANGE_WHATSAPP_NUMBER' }],
        ([state, { whatsappNumber }]) => ({ ...state, whatsappNumber })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CHANGE_METHOD' }],
        ([state, { method }]) => ({ ...state, method })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CANCEL_DETAILS' }],
        ([state]) => ({
          ...state,
          type: 'idle',
          nameErrorMessage: null,
          whatsappNumberErrorMessage: null,
        })
      )
      .with(
        [
          { type: P.union('askingDetails', 'error') },
          { type: 'SUBMIT_DETAILS' },
        ],
        ([state]) => {
          const nameErrorMessage = validateName(state.customerName);
          const whatsappNumber = validateWhatsappNumber(state.whatsappNumber);
          if (nameErrorMessage || whatsappNumber.errorMessage) {
            return {
              ...state,
              type: 'askingDetails',
              nameErrorMessage,
              whatsappNumberErrorMessage: whatsappNumber.errorMessage,
            };
          }
          return {
            ...state,
            type: 'creatingPayment',
            customerName: state.customerName.trim(),
            whatsappNumber: whatsappNumber.normalized,
            nameErrorMessage: null,
            whatsappNumberErrorMessage: null,
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
      .with(
        { type: 'creatingPayment' },
        ({ customerName, whatsappNumber, method }) => {
          this.paymentRepository
            .checkout({ customerName, whatsappNumber, method })
            .then((payment) => dispatch({ type: 'CHECKOUT_SUCCESS', payment }))
            .catch(() =>
              dispatch({
                type: 'CHECKOUT_ERROR',
                message: 'Failed to create payment',
              })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
