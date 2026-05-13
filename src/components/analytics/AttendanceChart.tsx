import React from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import {brand, shadow} from '../../theme/design';

interface AttendanceChartProps {
  data: {date: string; rate: number}[];
  title: string;
}

const chartWidth = Math.max(280, Dimensions.get('window').width - 40);
const chartHeight = 132;

const clampRate = (rate: number) => Math.max(0, Math.min(100, rate));

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
};

const AttendanceChart = ({data, title}: AttendanceChartProps) => {
  const chartData = React.useMemo(
    () =>
      (data ?? []).slice(-7).map(item => ({
        ...item,
        rate: clampRate(Number(item.rate) || 0),
      })),
    [data],
  );
  const dynamicStyles = React.useMemo(() => {
    const bars = chartData.reduce<Record<string, {height: number}>>(
      (stylesByIndex, item, index) => ({
        ...stylesByIndex,
        [`bar${index}`]: {
          height: Math.max(6, (item.rate / 100) * chartHeight),
        },
      }),
      {},
    );

    return StyleSheet.create(bars);
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartFrame}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>100%</Text>
          <Text style={styles.axisLabel}>50%</Text>
          <Text style={styles.axisLabel}>0%</Text>
        </View>
        <View style={styles.plotArea}>
          <View style={styles.gridLineTop} />
          <View style={styles.gridLineMiddle} />
          <View style={styles.gridLineBottom} />
          <View style={styles.barsRow}>
            {chartData.map((item, index) => (
              <View
                key={`${item.date}-${index}`}
                style={styles.barColumn}
                testID="attendance-chart-bar">
                <Text style={styles.valueLabel}>{Math.round(item.rate)}%</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, dynamicStyles[`bar${index}`]]}
                  />
                </View>
                <Text style={styles.tickLabel} numberOfLines={1}>
                  {formatDate(item.date)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.surface,
    borderRadius: 24,
    paddingTop: 14,
    paddingBottom: 12,
    marginVertical: 10,
    overflow: 'hidden',
    width: chartWidth,
    ...shadow.card,
  },
  title: {
    fontSize: 17,
    marginLeft: 18,
    fontWeight: '900',
    color: brand.ink,
  },
  chartFrame: {
    flexDirection: 'row',
    height: 192,
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  yAxis: {
    width: 36,
    height: chartHeight,
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  axisLabel: {
    color: brand.muted,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  plotArea: {
    flex: 1,
    marginLeft: 8,
    height: chartHeight + 44,
  },
  gridLineTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  gridLineMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: chartHeight / 2,
    height: 1,
    backgroundColor: '#EEF2F7',
  },
  gridLineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: chartHeight,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: chartHeight + 42,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueLabel: {
    color: brand.ink,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
  },
  barTrack: {
    width: '72%',
    height: chartHeight,
    borderRadius: 9,
    backgroundColor: '#FFF0F1',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
    backgroundColor: brand.primary,
  },
  tickLabel: {
    marginTop: 7,
    color: brand.muted,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 48,
  },
});

export default AttendanceChart;
