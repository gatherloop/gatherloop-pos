import { YStack } from 'tamagui';
import { TransactionDetailUsecase } from '../../domain';
import {
  TransactionPrintCustomer,
  TransactionPrintEmployee,
} from '../components';
import { useTransactionDetailController } from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type TransactionPrintScreenProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
};

export const TransactionPrintScreen = (props: TransactionPrintScreenProps) => {
  const controller = useTransactionDetailController(
    props.transactionDetailUsecase
  );
  const router = useRouter();
  useEffect(() => {
    if (controller.state.type === 'loaded') {
      const handleFocus = () => {
        window.removeEventListener('focus', handleFocus);
        router.push('/transactions');
      };
      window.addEventListener('focus', handleFocus);
      window.print();
    }
  }, [controller.state, router]);

  return (
    <YStack>
      <TransactionPrintCustomer {...controller} />
      <YStack borderWidth="$0.5" borderStyle="dashed" marginVertical="$5" />
      <TransactionPrintEmployee {...controller} />
      <YStack borderWidth="$0.5" borderStyle="dashed" marginVertical="$5" />
    </YStack>
  );
};
