import React from 'react';
import {View, StyleSheet, Text, LayoutChangeEvent} from 'react-native';
import {useTheme} from 'react-native-paper';

interface AttendanceChartProps {
  data: {date: string; rate: number}[];
  title: string;
}

const CHART_HEIGHT = 220;
const PLOT_TOP = 18;
const PLOT_RIGHT = 12;
const PLOT_BOTTOM = 34;
const PLOT_LEFT = 42;
const Y_TICKS = [0, 25, 50, 75, 100];

const formatDateLabel = (date: string) =>
  date
    ? new Date(date).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })
    : '';

const AttendanceChart = ({data, title}: AttendanceChartProps) => {
  const theme = useTheme();
  const [chartWidth, setChartWidth] = React.useState(0);
  const chartData = data.length > 0 ? data : [];
  const plotWidth = Math.max(chartWidth - PLOT_LEFT - PLOT_RIGHT, 1);
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const points = chartData.map((item, index) => {
    const x =
      PLOT_LEFT +
      (chartData.length <= 1 ? plotWidth / 2 : (index / (chartData.length - 1)) * plotWidth);
    const y = PLOT_TOP + (1 - Math.max(0, Math.min(item.rate, 100)) / 100) * plotHeight;

    return {x, y, item};
  });
  const xLabels =
    chartData.length <= 2
      ? chartData
      : [
          chartData[0],
          chartData[Math.floor(chartData.length / 2)],
          chartData[chartData.length - 1],
        ];

  const onChartLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.colors.elevation.level1},
      ]}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>{title}</Text>
      <View style={styles.chart} onLayout={onChartLayout}>
        {Y_TICKS.map(tick => {
          const y = PLOT_TOP + (1 - tick / 100) * plotHeight;

          return (
            <React.Fragment key={tick}>
              <Text
                style={[
                  styles.yLabel,
                  {top: y - 8, color: theme.colors.onSurfaceVariant},
                ]}>
                {tick}%
              </Text>
              <View
                style={[
                  styles.gridLine,
                  {
                    top: y,
                    left: PLOT_LEFT,
                    width: plotWidth,
                    backgroundColor: theme.colors.outlineVariant,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}

        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          const dx = next.x - point.x;
          const dy = next.y - point.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = `${Math.atan2(dy, dx)}rad`;

          return (
            <View
              key={`${point.item.date}-${next.item.date}`}
              style={[
                styles.lineSegment,
                {
                  left: (point.x + next.x) / 2 - length / 2,
                  top: (point.y + next.y) / 2 - 1.5,
                  width: length,
                  backgroundColor: theme.colors.primary,
                  transform: [{rotate: angle}],
                },
              ]}
            />
          );
        })}

        {points.map(point => (
          <View
            key={point.item.date}
            style={[
              styles.point,
              {
                left: point.x - 4,
                top: point.y - 4,
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.elevation.level1,
              },
            ]}
          />
        ))}

        {xLabels.map((item, index) => {
          const sourceIndex = chartData.indexOf(item);
          const x =
            PLOT_LEFT +
            (chartData.length <= 1
              ? plotWidth / 2
              : (sourceIndex / (chartData.length - 1)) * plotWidth);

          return (
            <Text
              key={`${item.date}-${index}`}
              style={[
                styles.xLabel,
                {left: x - 32, color: theme.colors.onSurfaceVariant},
              ]}>
              {formatDateLabel(item.date)}
            </Text>
          );
        })}

        {chartData.length === 0 ? (
          <Text style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
            No attendance data yet
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
  },
  chart: {
    height: CHART_HEIGHT,
    marginTop: 12,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: 36,
    fontSize: 10,
    textAlign: 'right',
  },
  xLabel: {
    position: 'absolute',
    bottom: 8,
    width: 64,
    fontSize: 10,
    textAlign: 'center',
  },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
  },
  point: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  emptyText: {
    position: 'absolute',
    left: PLOT_LEFT,
    right: PLOT_RIGHT,
    top: 86,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default AttendanceChart;
