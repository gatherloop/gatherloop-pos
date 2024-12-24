import { TransactionPrintUsecase } from '../../domain';
import { TransactionPrint } from '../components';
import { useTransactionPrintController } from '../controllers';

export type TransactionPrintScreenProps = {
  transactionPrintUsecase: TransactionPrintUsecase;
};

export const TransactionPrintScreen = (props: TransactionPrintScreenProps) => {
  const controller = useTransactionPrintController(
    props.transactionPrintUsecase
  );
  return <TransactionPrint {...controller} />;
};
