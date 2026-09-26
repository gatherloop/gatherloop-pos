import { match, P } from 'ts-pattern';
import {
  normalizeWhatsappNumber,
  Payment,
  PaymentDiningOption,
  PaymentMethod,
} from '../entities';
import {
  PaymentRepository,
  WhatsappNumberRejectedError,
  WhatsappNumberRejectionReason,
} from '../repositories';
import { Usecase } from './IUsecase';

const NAME_MAX_LENGTH = 60;

type Context = {
  payment: Payment | null;
  customerName: string;
  whatsappNumber: string;
  method: PaymentMethod;
  diningOption: PaymentDiningOption;
  verificationPhoto: string | null;
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
  | { type: 'CHANGE_DINING_OPTION'; diningOption: PaymentDiningOption }
  | { type: 'CAPTURE_PHOTO'; photo: string }
  | { type: 'RETAKE_PHOTO' }
  | { type: 'CANCEL_DETAILS' }
  | { type: 'SUBMIT_DETAILS' }
  | { type: 'CHECKOUT_SUCCESS'; payment: Payment }
  | { type: 'CHECKOUT_ERROR'; message: string }
  | {
      type: 'WHATSAPP_NUMBER_REJECTED';
      reason: WhatsappNumberRejectionReason;
    };

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

function whatsappNumberRejectionMessage(
  reason: WhatsappNumberRejectionReason
): string {
  return match(reason)
    .with(
      'invalid',
      () => 'Nomor WhatsApp tidak valid. Mohon periksa kembali.'
    )
    .with(
      'not_registered',
      () =>
        'Nomor WhatsApp tidak terdaftar di WhatsApp. Mohon periksa kembali.'
    )
    .exhaustive();
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
    return { errorMessage: whatsappNumberRejectionMessage('invalid'), normalized: trimmed };
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
      diningOption: 'dine_in',
      verificationPhoto: null,
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
        ([state, { whatsappNumber }]) => ({
          ...state,
          whatsappNumber,
          whatsappNumberErrorMessage: null,
        })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CHANGE_METHOD' }],
        ([state, { method }]) => ({
          ...state,
          method,
          verificationPhoto: null,
        })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CHANGE_DINING_OPTION' }],
        ([state, { diningOption }]) => ({ ...state, diningOption })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'CAPTURE_PHOTO' }],
        ([state, { photo }]) => ({ ...state, verificationPhoto: photo })
      )
      .with(
        [{ type: 'askingDetails' }, { type: 'RETAKE_PHOTO' }],
        ([state]) => ({ ...state, verificationPhoto: null })
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
          {
            type: P.union('askingDetails', 'error'),
            method: 'cod',
            verificationPhoto: null,
          },
          { type: 'SUBMIT_DETAILS' },
        ],
        ([state]) => state
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
      .with(
        [{ type: 'creatingPayment' }, { type: 'WHATSAPP_NUMBER_REJECTED' }],
        ([state, { reason }]) => ({
          ...state,
          type: 'askingDetails',
          whatsappNumberErrorMessage: whatsappNumberRejectionMessage(reason),
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
        ({
          customerName,
          whatsappNumber,
          method,
          diningOption,
          verificationPhoto,
        }) => {
          const normalizedWhatsappNumber =
            normalizeWhatsappNumber(whatsappNumber.trim()) ??
            whatsappNumber.trim();
          this.paymentRepository
            .checkout({
              customerName,
              whatsappNumber: normalizedWhatsappNumber,
              method,
              diningOption,
              verificationPhoto:
                method === 'cod' ? (verificationPhoto ?? undefined) : undefined,
            })
            .then((payment) => dispatch({ type: 'CHECKOUT_SUCCESS', payment }))
            .catch((error) =>
              error instanceof WhatsappNumberRejectedError
                ? dispatch({
                    type: 'WHATSAPP_NUMBER_REJECTED',
                    reason: error.reason,
                  })
                : dispatch({
                    type: 'CHECKOUT_ERROR',
                    message: 'Failed to create payment',
                  })
            );
        }
      )
      .otherwise(() => undefined);
  }
}
