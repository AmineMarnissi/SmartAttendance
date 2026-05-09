import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {Card} from 'react-native-paper';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
}

const StatCard = ({title, value, subtitle, color}: StatCardProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, {color: color || '#000'}]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    minWidth: '45%',
  },
  title: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#666',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 10,
    color: '#888',
  },
});

export default StatCard;
