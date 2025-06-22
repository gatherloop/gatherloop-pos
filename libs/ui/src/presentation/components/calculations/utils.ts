export const getCalculationStatus = (params: {
  totalCalculation: number;
  totalWallet: number;
}) => {
  console.log('totalCalculation', params.totalCalculation);
  console.log('totalWallet', params.totalWallet);
  const difference = params.totalCalculation - params.totalWallet;
  const differenceLabel = Math.abs(difference).toLocaleString('id');
  const status =
    difference > 0
      ? `Plus Rp. ${differenceLabel}`
      : difference < 0
      ? `Minus Rp. ${differenceLabel}`
      : `Balanced`;
  return status;
};
