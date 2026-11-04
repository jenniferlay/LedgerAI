import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type { ChatMessage, ChatAction } from './types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  onSelectAction?: (action: ChatAction) => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatMessageBubble({
  message,
  onRetry,
  onSelectAction,
}: ChatMessageBubbleProps) {
  const router = useRouter();
  const isUser = message.sender === 'user';
  const timeString = formatTime(message.timestamp);

  const handleActionPress = (action: ChatAction) => {
    if (action.action === 'navigate') {
      router.push(action.target as any);
    } else if (onSelectAction) {
      onSelectAction(action);
    }
  };

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
          <View style={styles.userMeta}>
            <Text style={styles.userTime}>{timeString}</Text>
            {message.status === 'sending' && (
              <Ionicons name="time-outline" size={12} color={colors.onPrimary} style={styles.statusIcon} />
            )}
            {message.status === 'error' && (
              <Pressable
                onPress={() => onRetry?.(message.id)}
                style={styles.retryButton}
                hitSlop={6}
              >
                <MaterialIcons name="refresh" size={14} color={colors.error} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={14} color="#ffffff" />
      </View>
      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{message.text}</Text>
          <Text style={styles.assistantTime}>{timeString}</Text>
        </View>

        {/* Action pills (if any) */}
        {message.actions && message.actions.length > 0 && (
          <View style={styles.actionsRow}>
            {message.actions.map((act, index) => (
              <Pressable
                key={`${act.target}-${index}`}
                onPress={() => handleActionPress(act)}
                style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
              >
                <Ionicons
                  name={act.action === 'navigate' ? 'arrow-forward-circle-outline' : 'chatbubble-ellipses-outline'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.actionPillText}>{act.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.margin,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.xl,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  userText: {
    ...typography.bodyMd,
    color: '#ffffff',
    lineHeight: 20,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  userTime: {
    ...typography.labelSm,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
  },
  statusIcon: {
    opacity: 0.75,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  retryText: {
    ...typography.labelSm,
    color: colors.error,
    fontSize: 10,
    fontWeight: '600',
  },

  assistantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.margin,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  assistantContent: {
    flex: 1,
    maxWidth: '88%',
    gap: 6,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 21,
  },
  assistantTime: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  actionPillPressed: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.primary,
  },
  actionPillText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '500',
  },
});
