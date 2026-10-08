import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import PressableScale from '../../shared/PressableScale';
import SectionHeader, { sectionHeaderStyles } from './SectionHeader';
import { CATEGORY_ICONS, type IconName } from './data';

const { colors, spacing, borderRadius } = theme;

const COLUMNS = 6;
const GAP = 8;

interface Props {
  selected: IconName;
  onSelect: (icon: IconName) => void;
}

export default function IconGrid({ selected, onSelect }: Props) {
  const [width, setWidth] = useState(0);
  const size = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <SectionHeader
        label="Select Icon"
        right={
          <Text style={sectionHeaderStyles.rightOutline}>Vector Library</Text>
        }
      />
      <View style={styles.vault}>
        <View style={styles.grid} onLayout={onLayout}>
          {size > 0 &&
            CATEGORY_ICONS.map((icon) => {
              const active = icon === selected;
              return (
                <PressableScale
                  key={icon}
                  accessibilityLabel={`${icon} category icon`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  scale={0.9}
                  onPress={() => onSelect(icon)}
                  style={[
                    styles.cell,
                    { width: size, height: size },
                    active ? styles.cellActive : styles.cellIdle,
                  ]}
                >
                  <MaterialIcons
                    name={icon}
                    size={24}
                    color={active ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                </PressableScale>
              );
            })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  vault: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIdle: { backgroundColor: colors.surfaceContainerHigh },
  cellActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
