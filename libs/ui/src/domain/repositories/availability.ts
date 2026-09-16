import { AvailabilityForm, AvailabilityProduct } from '../entities';

export interface AvailabilityRepository {
  fetchAvailabilityList: () => Promise<AvailabilityProduct[]>;

  updateAvailability: (form: AvailabilityForm) => Promise<AvailabilityProduct[]>;
}
