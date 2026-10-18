import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import PressableScale from '@/components/shared/PressableScale';
import SectionHeader, { sectionHeaderStyles } from './SectionHeader';
import { searchIcons, type IconName } from './data';

const { colors, spacing, borderRadius } = theme;

const COLUMNS = 6;
const GAP = 8;

interface Props {
  selected: IconName;
  onSelect: (icon: IconName) => void;
}

export default function IconGrid({ selected, onSelect }: Props) {
  const [width, setWidth] = useState(0);
  const [query, setQuery] = useState('');

  const size = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const icons = useMemo(() => searchIcons(query), [query]);
  const isSearching = query.trim().length > 0;

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <SectionHeader
        label="Select Icon"
        right={
          <Text style={sectionHeaderStyles.rightOutline}>
            {isSearching ? `${icons.length} found` : 'Popular'}
          </Text>
        }
      />

      <View style={styles.vault}>
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.onSurfaceVariant}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search icons (e.g. coffee, car, gift)"
            placeholderTextColor={colors.onSurfaceVariant}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            accessibilityLabel="Search icons"
          />
          {isSearching && (
            <PressableScale
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              scale={0.9}
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </PressableScale>
          )}
        </View>

        <View style={styles.grid} onLayout={onLayout}>
          {size > 0 &&
            icons.map((icon) => {
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

        {isSearching && icons.length === 0 && (
          <Text style={styles.emptyText}>
            No icons match “{query.trim()}”
          </Text>
        )}
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
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlignVertical: 'center',
    lineHeight: 20
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyText: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.md,
  },
});