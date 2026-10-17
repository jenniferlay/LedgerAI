import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/theme';

export const FORM_HEADER_HEIGHT = 56;

interface Props {
  title: string;
  onCancel?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export default function FormHeader({ title, onCancel, onDelete, isDeleting }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons
            name="close"
            size={20}
            color={colors.onSurfaceVariant}
            style={styles.cancelIcon}
          />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {onDelete && (
          <Pressable
            accessibilityLabel="Delete Expense"
            accessibilityRole="button"
            onPress={onDelete}
            disabled={isDeleting}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons
              name="delete-outline"
              size={20}
              color={colors.error}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(16, 20, 24, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  bar: {
    height: FORM_HEADER_HEIGHT,
    paddingHorizontal: spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    height: 40,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIcon: { marginRight: 4 },
  cancelText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
