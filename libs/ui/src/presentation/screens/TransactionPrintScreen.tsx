import { YStack } from 'tamagui';
import { TransactionPrintUsecase } from '../../domain';
import {
  TransactionPrintCustomer,
  TransactionPrintEmployee,
} from '../components';
import { useTransactionPrintController } from '../controllers';

export type TransactionPrintScreenProps = {
  transactionPrintUsecase: TransactionPrintUsecase;
};

export const TransactionPrintScreen = (props: TransactionPrintScreenProps) => {
  const controller = useTransactionPrintController(
    props.transactionPrintUsecase
  );
  return (
    <YStack gap="$2">
      <TransactionPrintCustomer {...controller} />
      <YStack borderWidth="$0.5" borderStyle="dashed" />
      <TransactionPrintEmployee {...controller} />
    </YStack>
  );
};
