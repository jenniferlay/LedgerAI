import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type { QuickPrompt } from './types';

interface ChatWelcomeProps {
  onSelectPrompt: (prompt: string) => void;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    category: 'Spending',
    label: 'How much did I spend this month?',
    prompt: 'How much did I spend this month?',
    icon: 'credit-card',
  },
  {
    id: '2',
    category: 'Net Worth',
    label: "What's my current net worth?",
    prompt: "What's my current net worth?",
    icon: 'account-balance-wallet',
  },
  {
    id: '3',
    category: 'Budgets',
    label: 'How are my budgets looking?',
    prompt: 'How are my budgets looking?',
    icon: 'pie-chart',
  },
  {
    id: '4',
    category: 'Accounts',
    label: 'What is my bank account balance?',
    prompt: 'What are my linked bank balances?',
    icon: 'account-balance',
  },
];

export default function ChatWelcome({ onSelectPrompt }: ChatWelcomeProps) {
  return (
    <View style={styles.container}>
      {/* Intro hero */}
      <View style={styles.heroSection}>
        <View style={styles.glowOuter}>
          <View style={styles.avatarLarge}>
            <Ionicons name="sparkles" size={32} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.heroTitle}>Meet Marty</Text>
        <Text style={styles.heroSubtitle}>
          Your down-to-earth personal financial advisor. Ask me questions about your spending, accounts, net worth, and monthly budgets.
        </Text>
      </View>

      {/* Suggested prompts section */}
      <View style={styles.promptsSection}>
        <Text style={styles.promptsHeader}>SUGGESTED QUESTIONS</Text>
        <View style={styles.promptsGrid}>
          {QUICK_PROMPTS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => onSelectPrompt(item.prompt)}
              style={({ pressed }) => [styles.promptCard, pressed && styles.promptCardPressed]}
            >
              <View style={styles.promptIconContainer}>
                <MaterialIcons name={item.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={styles.promptLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Security / Privacy disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.outline} />
        <Text style={styles.disclaimerText}>
          Connected to your verified LedgerAI financial records
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  glowOuter: {
    padding: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  heroTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 4,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  promptsSection: {
    gap: spacing.sm,
  },
  promptsHeader: {
    ...typography.labelSm,
    color: colors.outline,
    letterSpacing: 1.2,
    paddingLeft: 4,
  },
  promptsGrid: {
    gap: spacing.sm,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promptCardPressed: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.primary,
  },
  promptIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  disclaimerText: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 11,
  },
});
