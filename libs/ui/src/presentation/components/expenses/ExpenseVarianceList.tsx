import { H6, Paragraph, XStack, YStack } from 'tamagui';
import { EmptyView } from '../base';
import { ExpenseVarianceRow } from '../../../domain';

export type ExpenseVarianceListProps = {
  rows: ExpenseVarianceRow[];
  totalRevenue: number;
  totalExpense: number;
  unspentPercentage: number | null;
};

const formatCurrency = (value: number) => `Rp. ${value.toLocaleString('id')}`;
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
const formatSignedPercentage = (value: number) =>
  `${value > 0 ? '+' : ''}${formatPercentage(value)}`;

export const ExpenseVarianceList = ({
  rows,
  totalRevenue,
  totalExpense,
  unspentPercentage,
}: ExpenseVarianceListProps) => {
  return rows.length === 0 ? (
    <EmptyView
      title="No budgets to compare"
      subtitle="Add a budget with a target to see target vs. actual variance."
    />
  ) : (
    <YStack gap="$2" testID="expense-variance-list">
      <H6>Target vs. Actual</H6>
      <XStack gap="$3">
        <Paragraph flex={2} fontWeight="700">
          Budget
        </Paragraph>
        <Paragraph flex={1} fontWeight="700">
          Target
        </Paragraph>
        <Paragraph flex={1} fontWeight="700">
          Actual
        </Paragraph>
        <Paragraph flex={1} fontWeight="700">
          Delta
        </Paragraph>
      </XStack>
      {rows.map((row) => (
        <XStack key={row.budgetId} gap="$3" testID={`variance-row-${row.budgetId}`}>
          <Paragraph flex={2}>{row.budgetName}</Paragraph>
          <Paragraph flex={1}>
            {row.targetPercentage === null
              ? '—'
              : formatPercentage(row.targetPercentage)}
          </Paragraph>
          <Paragraph flex={1}>
            {row.actualPercentage === null
              ? formatCurrency(row.actualAmount)
              : formatPercentage(row.actualPercentage)}
          </Paragraph>
          <Paragraph
            flex={1}
            fontWeight={row.isOverTarget ? '700' : undefined}
            color={row.isOverTarget ? '$red10' : undefined}
          >
            {row.deltaPercentage === null
              ? '—'
              : formatSignedPercentage(row.deltaPercentage)}
          </Paragraph>
        </XStack>
      ))}
      <XStack gap="$3" borderTopWidth={1} borderColor="$borderColor" paddingTop="$2">
        <Paragraph flex={2} fontWeight="700">
          Unspent / Profit
        </Paragraph>
        <Paragraph flex={2} fontWeight="700">
          {unspentPercentage === null
            ? formatCurrency(totalRevenue - totalExpense)
            : formatPercentage(unspentPercentage)}
        </Paragraph>
      </XStack>
    </YStack>
  );
};
