import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {brand, shadow} from '../../theme/design';

type BrandLogoProps = {
  size?: number;
  showText?: boolean;
  inverted?: boolean;
};

const BrandLogo = ({
  size = 78,
  showText = true,
  inverted = false,
}: BrandLogoProps) => {
  const markSize = size;
  const dotSize = Math.max(7, size * 0.13);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize * 0.28,
            backgroundColor: inverted ? '#FFFFFF' : brand.primary,
            transform: [{rotate: '-12deg'}],
          },
        ]}>
        <View
          style={[
            styles.scanLine,
            {backgroundColor: inverted ? brand.primary : '#FFFFFF'},
          ]}
        />
        <View style={styles.dotRow}>
          <View
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: inverted ? brand.primary : '#FFFFFF',
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: inverted ? brand.primary : '#FFFFFF',
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.diamond,
            {borderColor: inverted ? brand.primary : '#FFFFFF'},
          ]}
        />
      </View>
      {showText && (
        <View style={styles.textWrap}>
          <Text
            style={[styles.title, {color: inverted ? '#FFFFFF' : brand.ink}]}>
            Intelligent
          </Text>
          <Text
            style={[styles.title, {color: inverted ? '#FFFFFF' : brand.ink}]}>
            Register
          </Text>
          <Text
            style={[
              styles.tagline,
              {color: inverted ? '#FFE5E7' : brand.muted},
            ]}>
            Smart face attendance
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center'},
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  scanLine: {
    position: 'absolute',
    width: '66%',
    height: 4,
    borderRadius: 6,
    opacity: 0.9,
  },
  dotRow: {flexDirection: 'row', gap: 8, transform: [{rotate: '12deg'}]},
  dot: {},
  diamond: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    borderWidth: 2,
    borderRadius: 10,
    opacity: 0.9,
  },
  textWrap: {alignItems: 'center', marginTop: 18},
  title: {fontSize: 30, fontWeight: '900', lineHeight: 31, letterSpacing: -0.8},
  tagline: {marginTop: 8, fontSize: 13, fontWeight: '700'},
});

export default BrandLogo;
