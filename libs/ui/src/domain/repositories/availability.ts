import {
  AvailabilityForm,
  AvailabilityLevel,
  AvailabilityMovement,
  AvailabilityProduct,
} from '../entities';

export interface AvailabilityRepository {
  fetchAvailabilityList: () => Promise<AvailabilityProduct[]>;

  updateAvailability: (form: AvailabilityForm) => Promise<AvailabilityProduct[]>;

  fetchAvailabilityMovements: (
    level: AvailabilityLevel,
    id: number
  ) => Promise<AvailabilityMovement[]>;
}
