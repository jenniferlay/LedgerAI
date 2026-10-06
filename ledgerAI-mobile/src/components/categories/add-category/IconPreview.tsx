import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import PressableScale from './PressableScale';
import type { IconName } from './types';

const { colors, spacing } = theme;

interface Props {
  icon: IconName;
}

export default function IconPreview({ icon }: Props) {
  return (
    <View style={styles.wrapper}>
      <PressableScale
        accessibilityLabel="Selected category icon preview"
        scale={0.95}
        style={styles.circle}
      >
        <MaterialIcons name={icon} size={36} color={colors.primary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
});
