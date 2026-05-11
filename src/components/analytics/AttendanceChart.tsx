import React from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import {
  VictoryChart,
  VictoryAxis,
  VictoryLine,
} from 'victory-native';
import {useTheme} from 'react-native-paper';

interface AttendanceChartProps {
  data: {date: string; rate: number}[];
  title: string;
}

const AttendanceChart = ({data, title}: AttendanceChartProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.colors.elevation.level1},
      ]}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>{title}</Text>
      <VictoryChart
        width={Dimensions.get('window').width - 40}
        height={250}
        domainPadding={20}>
        <VictoryAxis
          tickFormat={(x: string | number | Date) =>
            new Date(x).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })
          }
          style={{
            tickLabels: {fontSize: 10, fill: theme.colors.onSurfaceVariant},
            axis: {stroke: theme.colors.outline},
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(y: string | number) => `${y}%`}
          style={{
            tickLabels: {fontSize: 10, fill: theme.colors.onSurfaceVariant},
            axis: {stroke: theme.colors.outline},
          }}
        />
        <VictoryLine
          data={data}
          x="date"
          y="rate"
          style={{data: {stroke: theme.colors.primary, strokeWidth: 3}}}
          interpolation="natural"
        />
      </VictoryChart>
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
});

export default AttendanceChart;
