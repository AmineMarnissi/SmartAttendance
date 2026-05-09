import React from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import {
  VictoryChart,
  VictoryTheme,
  VictoryAxis,
  VictoryLine,
} from 'victory-native';

interface AttendanceChartProps {
  data: {date: string; rate: number}[];
  title: string;
}

const AttendanceChart = ({data, title}: AttendanceChartProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <VictoryChart
        theme={VictoryTheme.material}
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
          style={{tickLabels: {fontSize: 10}}}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(y: string | number) => `${y}%`}
          style={{tickLabels: {fontSize: 10}}}
        />
        <VictoryLine
          data={data}
          x="date"
          y="rate"
          style={{data: {stroke: '#4CAF50', strokeWidth: 3}}}
          interpolation="natural"
        />
      </VictoryChart>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
