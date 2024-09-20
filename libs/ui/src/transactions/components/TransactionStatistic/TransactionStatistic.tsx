import {
  VictoryChart,
  VictoryTheme,
  VictoryLine,
  VictoryTooltip,
  VictoryScatter,
  VictoryAxis,
  VictoryLegend,
} from 'victory';
import { useTransactionStatisticState } from './TransactionStatistic.state';
import { ErrorView, LoadingView } from '../../../base';
import { Button, H6, XStack, YStack } from 'tamagui';

export const TransactionStatistic = () => {
  const { statistics, status, refetch, groupBy, setGroupBy } =
    useTransactionStatisticState();

  return status === 'pending' ? (
    <LoadingView title="Fetching Statistics..." />
  ) : status === 'success' ? (
    <YStack gap="$2">
      <H6>Group By</H6>
      <XStack gap="$3">
        <Button
          size="$2"
          onPress={() => setGroupBy('date')}
          disabled={groupBy === 'date'}
          theme={groupBy === 'date' ? 'blue' : undefined}
        >
          Date
        </Button>
        <Button
          size="$2"
          onPress={() => setGroupBy('month')}
          disabled={groupBy === 'month'}
          theme={groupBy === 'month' ? 'blue' : undefined}
        >
          Month
        </Button>
      </XStack>
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
          data={statistics.map((statistic) => ({
            y: statistic.total,
            x: statistic.date,
          }))}
        />
        <VictoryLine
          style={{
            data: { stroke: '#24c48e' },
            parent: { border: '1px solid #ccc' },
          }}
          data={statistics.map((statistic) => ({
            y: statistic.totalIncome,
            x: statistic.date,
          }))}
        />
        <VictoryScatter
          style={{ data: { fill: '#3189c4' } }}
          size={3}
          data={statistics.map((statistic) => ({
            y: statistic.total,
            x: statistic.date,
          }))}
          labels={({ datum }) => `[Total] Date: ${datum.x} Total: ${datum.y}`}
          labelComponent={<VictoryTooltip constrainToVisibleArea />}
        />
        <VictoryScatter
          style={{ data: { fill: '#24c48e' } }}
          size={3}
          data={statistics.map((statistic) => ({
            y: statistic.totalIncome,
            x: statistic.date,
          }))}
          labels={({ datum }) => `[Income] Date: ${datum.x} Total: ${datum.y}`}
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
    </YStack>
  ) : (
    <ErrorView
      title="Failed to Fetch Statistics"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={refetch}
    />
  );
};
