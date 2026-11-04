import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

interface ChatHeaderProps {
  onClearChat: () => void;
  messageCount: number;
}

export default function ChatHeader({ onClearChat, messageCount }: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleClearPress = () => {
    if (messageCount === 0) return;
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to start a new chat with Marty?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearChat },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.content}>
        {/* Marty Avatar & Status */}
        <View style={styles.leftSection}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={20} color="#ffffff" />
            <View style={styles.activeDot} />
          </View>
          <View style={styles.titleColumn}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>Marty</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.subtitleText}>Financial Advisor</Text>
          </View>
        </View>

        {/* Clear / New Chat Action */}
        {messageCount > 0 && (
          <Pressable
            accessibilityLabel="Clear chat conversation"
            accessibilityRole="button"
            onPress={handleClearPress}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.outline} />
            <Text style={styles.clearText}>New Chat</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  titleColumn: {
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  subtitleText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  clearText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },
});
