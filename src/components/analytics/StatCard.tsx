import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {Card, useTheme} from 'react-native-paper';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
}

const StatCard = ({title, value, subtitle, color}: StatCardProps) => {
  const theme = useTheme();
  return (
    <Card style={[styles.card, {backgroundColor: theme.colors.elevation.level2}]}>
      <Card.Content>
        <Text style={[styles.title, {color: theme.colors.onSurfaceVariant}]}>{title}</Text>
        <Text style={[styles.value, {color: color || theme.colors.primary}]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    minWidth: '45%',
  },
  title: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 10,
  },
});

export default StatCard;
