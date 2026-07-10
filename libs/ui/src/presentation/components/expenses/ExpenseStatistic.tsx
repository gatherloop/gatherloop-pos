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
  ExpenseStatisticView,
} from '../../../domain';

type GroupBy = 'date' | 'month';

export type ExpenseStatisticDateRangeChange = {
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
  groupBy: GroupBy;
};

export type ExpenseStatisticSeriesPoints = {
  budgetId: number;
  budgetName: string;
  points: { x: string; y: number }[];
};

export type ExpenseStatisticProps = {
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  view: ExpenseStatisticView;
  onViewChange: (view: ExpenseStatisticView) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
  groupBy: GroupBy;
  onRetryButtonPress: () => void;
  onDateRangeChange: (range: ExpenseStatisticDateRangeChange) => void;
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
  budgetSeries: ExpenseStatisticSeriesPoints[];
  combinedStatistics: { x: string; y: number }[];
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

// Fixed-order categorical palette; assigned by position, never re-cycled per filter.
const SERIES_COLORS = [
  '#2a78d6',
  '#1baf7a',
  '#eda100',
  '#008300',
  '#4a3aa7',
  '#e34948',
  '#e87ba4',
  '#eb6834',
];

const colorForIndex = (index: number) =>
  SERIES_COLORS[index % SERIES_COLORS.length];

export const ExpenseStatistic = ({
  view,
  onViewChange,
  groupBy,
  onGroupByChange,
  variant,
  onRetryButtonPress,
  onDateRangeChange,
  preset,
  startDate,
  endDate,
  budgetSeries,
  combinedStatistics,
}: ExpenseStatisticProps) => {
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

  const isEmpty = budgetSeries.length === 0 && combinedStatistics.length === 0;

  return variant.type === 'loading' ? (
    <LoadingView title="Fetching Statistics..." />
  ) : variant.type === 'loaded' ? (
    <YStack gap="$2">
      <H6>View</H6>
      <XStack gap="$3">
        <Button
          size="$2"
          onPress={() => onViewChange('budget')}
          disabled={view === 'budget'}
          theme={view === 'budget' ? 'blue' : undefined}
        >
          By Budget
        </Button>
        <Button
          size="$2"
          onPress={() => onViewChange('combined')}
          disabled={view === 'combined'}
          theme={view === 'combined' ? 'blue' : undefined}
        >
          Combined
        </Button>
      </XStack>
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
          title="No expenses in this range"
          subtitle="Try selecting a different date range or preset."
        />
      ) : (
        <VictoryChart
          theme={VictoryTheme.material}
          width={600}
          height={300}
          padding={{ top: 50, bottom: 50, left: 80, right: 50 }}
        >
          {view === 'budget'
            ? [
                ...budgetSeries.map((series, index) => (
                  <VictoryLine
                    key={`line-${series.budgetId}`}
                    style={{
                      data: { stroke: colorForIndex(index) },
                      parent: { border: '1px solid #ccc' },
                    }}
                    data={series.points}
                  />
                )),
                ...budgetSeries.map((series, index) => (
                  <VictoryScatter
                    key={`scatter-${series.budgetId}`}
                    style={{ data: { fill: colorForIndex(index) } }}
                    size={6}
                    data={series.points}
                    labels={({ datum }) =>
                      `[${series.budgetName}] Date: ${datum.x} Total: ${datum.y}`
                    }
                    labelComponent={<VictoryTooltip constrainToVisibleArea />}
                  />
                )),
              ]
            : [
                <VictoryLine
                  key="line-combined"
                  style={{
                    data: { stroke: colorForIndex(0) },
                    parent: { border: '1px solid #ccc' },
                  }}
                  data={combinedStatistics}
                />,
                <VictoryScatter
                  key="scatter-combined"
                  style={{ data: { fill: colorForIndex(0) } }}
                  size={6}
                  data={combinedStatistics}
                  labels={({ datum }) =>
                    `[Total] Date: ${datum.x} Total: ${datum.y}`
                  }
                  labelComponent={<VictoryTooltip constrainToVisibleArea />}
                />,
              ]}
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
          {view === 'budget' ? (
            <VictoryLegend
              x={50}
              y={10}
              orientation="horizontal"
              gutter={20}
              itemsPerRow={4}
              colorScale={budgetSeries.map((_, index) => colorForIndex(index))}
              data={budgetSeries.map((series) => ({ name: series.budgetName }))}
              style={{
                labels: { fill: '#9f9f9f' },
              }}
            />
          ) : (
            <VictoryLegend
              x={125}
              y={10}
              orientation="horizontal"
              gutter={20}
              colorScale={[colorForIndex(0)]}
              data={[{ name: 'Total' }]}
              style={{
                labels: { fill: '#9f9f9f' },
              }}
            />
          )}
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
