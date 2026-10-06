import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import theme from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ActivityIcon = ComponentProps<typeof MaterialIcons>['name'];

export interface ActivityItem {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: string;
  kind: 'income' | 'expense';
  icon: ActivityIcon;
  note?: string;
}

const sampleActivity: ActivityItem[] = [
  {
    id: 'apple',
    merchant: 'Apple Store',
    category: 'Tech & Gear',
    date: 'Today, 2:15 PM',
    amount: '-$199.00',
    kind: 'expense',
    icon: 'laptop-mac',
    note: 'Categorized under Gadgets · Within monthly discretionary tier',
  },
  {
    id: 'whole-foods',
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'Yesterday',
    amount: '-$78.40',
    kind: 'expense',
    icon: 'shopping-cart',
  },
  {
    id: 'stripe',
    merchant: 'Stripe Payout',
    category: 'Income · Freelance',
    date: 'Oct 24',
    amount: '+$3,250.00',
    kind: 'income',
    icon: 'payments',
  },
  {
    id: 'equinox',
    merchant: 'Equinox Fitness Club',
    category: 'Recurring Subscription',
    date: 'Oct 23',
    amount: '-$280.00',
    kind: 'expense',
    icon: 'fitness-center',
  },
];

interface RecentActivityProps {
  items?: ActivityItem[];
}

export default function RecentActivity({ items = sampleActivity }: RecentActivityProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.heading}>Recent Activity</ThemedText>
      <View style={styles.list}>
        {items.map((item) => (
          <ThemedView key={item.id} type="surfaceContainer" style={styles.card}>
            <View style={styles.row}>
              <ThemedView
                type={item.kind === 'income' ? 'secondaryContainer' : 'surfaceContainerHigh'}
                style={styles.icon}
              >
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={item.kind === 'income' ? theme.colors.primary : theme.colors.onSurface}
                />
              </ThemedView>
              <View style={styles.details}>
                <ThemedText type="smallBold" numberOfLines={1}>{item.merchant}</ThemedText>
                <ThemedText type="small" themeColor={item.kind === 'income' ? 'primary' : 'onSurfaceVariant'} numberOfLines={1}>
                  {item.category} · {item.date}
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                themeColor={item.kind === 'income' ? 'primary' : 'onSurface'}
                style={styles.amount}
              >
                {item.amount}
              </ThemedText>
            </View>
            {item.note && (
              <ThemedView type="surfaceContainerLow" style={styles.note}>
                <MaterialIcons name="auto-awesome" size={14} color={theme.colors.primary} />
                <ThemedText type="small" themeColor="onSurfaceVariant" numberOfLines={2} style={styles.noteText}>
                  {item.note}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        ))}
      </View>
    </View>
  );
}

const { colors, spacing, borderRadius } = theme;

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: {
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  list: { gap: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, minWidth: 0 },
  amount: { textAlign: 'right' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  noteText: { flex: 1 },
});
