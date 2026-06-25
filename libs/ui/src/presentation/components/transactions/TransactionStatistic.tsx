import { useState } from 'react';
import {
  EmptyView,
  ErrorView,
  LoadingView,
  VictoryChart,
  VictoryTheme,
  VictoryLine,
  VictoryTooltip,
  VictoryScatter,
  VictoryAxis,
  VictoryLegend,
} from '../base';
import { Button, H6, Input, Paragraph, XStack, YStack } from 'tamagui';
import {
  getDateRangeForPreset,
  TransactionStatisticPreset,
} from '../../../domain';

type GroupBy = 'date' | 'month';

export type TransactionStatisticDateRangeChange = {
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
  groupBy: GroupBy;
};

export type TransactionStatisticProps = {
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  onGroupByChange: (groupBy: GroupBy) => void;
  groupBy: GroupBy;
  onRetryButtonPress: () => void;
  onDateRangeChange: (range: TransactionStatisticDateRangeChange) => void;
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
  totalStatistics: { x: string; y: number }[];
  totalIncomeStatistics: { x: string; y: number }[];
};

const PRESET_OPTIONS: { value: TransactionStatisticPreset; label: string }[] =
  [
    { value: 'last7Days', label: 'Last 7 Days' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'last12Months', label: 'Last 12 Months' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom...' },
  ];

export const TransactionStatistic = ({
  groupBy,
  onGroupByChange,
  variant,
  onRetryButtonPress,
  onDateRangeChange,
  preset,
  startDate,
  endDate,
  totalStatistics,
  totalIncomeStatistics,
}: TransactionStatisticProps) => {
  const [isCustomOpen, setIsCustomOpen] = useState(preset === 'custom');
  const [customStartDate, setCustomStartDate] = useState(startDate ?? '');
  const [customEndDate, setCustomEndDate] = useState(endDate ?? '');
  const [customRangeError, setCustomRangeError] = useState<string | null>(
    null
  );

  const handlePresetPress = (selected: TransactionStatisticPreset) => {
    if (selected === 'custom') {
      setIsCustomOpen(true);
      setCustomRangeError(null);
      return;
    }
    setIsCustomOpen(false);
    setCustomRangeError(null);
    const range = getDateRangeForPreset(selected);
    onDateRangeChange({
      preset: selected,
      startDate: range.startDate,
      endDate: range.endDate,
      groupBy: range.groupBy,
    });
  };

  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      setCustomRangeError('Please fill in both start and end dates');
      return;
    }
    if (customStartDate > customEndDate) {
      setCustomRangeError('Start date must be on or before end date');
      return;
    }
    setCustomRangeError(null);
    onDateRangeChange({
      preset: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
      groupBy: 'date',
    });
  };

  const isEmpty =
    totalStatistics.length === 0 && totalIncomeStatistics.length === 0;

  return variant.type === 'loading' ? (
    <LoadingView title="Fetching Statistics..." />
  ) : variant.type === 'loaded' ? (
    <YStack gap="$2">
      <H6>Date Range</H6>
      <XStack gap="$3" flexWrap="wrap">
        {PRESET_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="$2"
            onPress={() => handlePresetPress(option.value)}
            disabled={preset === option.value && option.value !== 'custom'}
            theme={preset === option.value ? 'blue' : undefined}
          >
            {option.label}
          </Button>
        ))}
      </XStack>
      {isCustomOpen ? (
        <YStack gap="$2">
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <Input
              size="$2"
              placeholder="YYYY-MM-DD"
              value={customStartDate}
              onChangeText={setCustomStartDate}
            />
            <Paragraph>to</Paragraph>
            <Input
              size="$2"
              placeholder="YYYY-MM-DD"
              value={customEndDate}
              onChangeText={setCustomEndDate}
            />
            <Button size="$2" onPress={handleApplyCustomRange}>
              Apply
            </Button>
          </XStack>
          {customRangeError ? (
            <Paragraph color="$red10">{customRangeError}</Paragraph>
          ) : null}
        </YStack>
      ) : null}
      <H6>Group By</H6>
      <XStack gap="$3">
        <Button
          size="$2"
          onPress={() => onGroupByChange('date')}
          disabled={groupBy === 'date'}
          theme={groupBy === 'date' ? 'blue' : undefined}
        >
          Date
        </Button>
        <Button
          size="$2"
          onPress={() => onGroupByChange('month')}
          disabled={groupBy === 'month'}
          theme={groupBy === 'month' ? 'blue' : undefined}
        >
          Month
        </Button>
      </XStack>
      {isEmpty ? (
        <EmptyView
          title="No transactions in this range"
          subtitle="Try selecting a different date range or preset."
        />
      ) : (
        <VictoryChart
          theme={VictoryTheme.material}
          width={600}
          height={300}
          padding={{ top: 50, bottom: 50, left: 80, right: 50 }}
        >
          <VictoryLine
            style={{
              data: { stroke: '#3189c4' },
              parent: { border: '1px solid #ccc' },
            }}
            data={totalStatistics}
          />
          <VictoryLine
            style={{
              data: { stroke: '#24c48e' },
              parent: { border: '1px solid #ccc' },
            }}
            data={totalIncomeStatistics}
          />
          <VictoryScatter
            style={{ data: { fill: '#3189c4' } }}
            size={6}
            data={totalStatistics}
            labels={({ datum }) =>
              `[Total] Date: ${datum.x} Total: ${datum.y}`
            }
            labelComponent={<VictoryTooltip constrainToVisibleArea />}
          />
          <VictoryScatter
            style={{ data: { fill: '#24c48e' } }}
            size={6}
            data={totalIncomeStatistics}
            labels={({ datum }) =>
              `[Income] Date: ${datum.x} Total: ${datum.y}`
            }
            labelComponent={<VictoryTooltip constrainToVisibleArea />}
          />
          <VictoryAxis
            style={{
              axis: { stroke: 'none' },
              ticks: { stroke: 'none' },
              tickLabels: { fill: 'none' },
              grid: {
                stroke: 'none',
              },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fill: '#9f9f9f' },
            }}
          />
          <VictoryLegend
            x={125}
            y={10}
            orientation="horizontal"
            gutter={20}
            colorScale={['#3189c4', '#24c48e']}
            data={[{ name: 'Total' }, { name: 'Income' }]}
            style={{
              labels: { fill: '#9f9f9f' },
            }}
          />
        </VictoryChart>
      )}
    </YStack>
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Statistics"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
