// Mock for api-contract module used in data transformer tests
// The actual module requires generated code that may not exist in test environments

export const useSupplierList = jest.fn().mockReturnValue({ data: undefined });
export const useProductList = jest.fn().mockReturnValue({ data: undefined });
