// eslint-disable-next-line @nx/enforce-module-boundaries
import { Rental as ApiRental } from '../../../../api-contract/src';
import { Rental, RentalCheckinForm, RentalCheckoutForm } from '../../domain';
import { toVariant } from './variant.transformer';

export function toRental(rental: ApiRental): Rental {
  return {
    id: rental.id,
    code: rental.code,
    name: rental.name,
    checkinAt: rental.checkinAt,
    checkoutAt: rental.checkoutAt ?? null,
    createdAt: rental.createdAt,
    variant: toVariant(rental.variant),
  };
}

export function toApiRentalCheckin(form: RentalCheckinForm) {
  return form.rentals.map((rental) => ({
    code: rental.code,
    name: form.name,
    variantId: rental.variant.id,
    checkinAt: form.checkinAt
      ? new Date(
          form.checkinAt.year,
          form.checkinAt.month,
          form.checkinAt.date,
          form.checkinAt.hour,
          form.checkinAt.minute,
          0,
          0
        ).toISOString()
      : new Date().toISOString(),
  }));
}

export function toApiRentalCheckout(form: RentalCheckoutForm) {
  return form.rentals.map((rental) => rental.id);
}
