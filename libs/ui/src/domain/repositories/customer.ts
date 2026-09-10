export interface CustomerRepository {
  fetchCurrentName: () => Promise<string>;
}
