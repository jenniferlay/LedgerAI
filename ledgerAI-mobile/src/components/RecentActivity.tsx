import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import theme from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getExpenses, subscribeToExpenseUpdates } from '@/services/expenses-api';
import type { ExpenseFeedItem } from '@/services/expenses-api';

const SKELETON_ROWS = 4;
const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const { colors, spacing, borderRadius } = theme;

export interface ActivityItem {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: string;
  kind: 'income' | 'expense';
  note?: string;
}

function formatActivityDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatActivityAmount(amount: number): string {
  return amountFormatter.format(amount);
}

function toActivityItem(item: ExpenseFeedItem): ActivityItem {
  const isIncome = item.source === 'plaid' && item.amount < 0;

  return {
    id: `${item.source}-${item.id}`,
    merchant: item.merchant || item.description,
    category: item.source === 'manual' ? 'Manual expense' : 'Bank transaction',
    date: formatActivityDate(item.spent_on),
    amount: formatActivityAmount(Math.abs(item.amount) * (isIncome ? 1 : -1)),
    kind: isIncome ? 'income' : 'expense',
    note: item.merchant ? item.description : undefined,
  };
}

function ActivitySkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <View key={row} style={[styles.card, styles.skeletonCard]}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonDetails}>
            <View style={[styles.skeletonBar, { width: '60%', height: 14 }]} />
            <View style={[styles.skeletonBar, { width: '42%', height: 12 }]} />
          </View>
          <View style={[styles.skeletonBar, { width: 64, height: 14 }]} />
        </View>
      ))}
    </>
  );
}

function ActivityError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <ThemedText type="small" themeColor="error">{message}</ThemedText>
      <Pressable accessibilityRole="button" onPress={onRetry}>
        <ThemedText type="smallBold" themeColor="primary">Try again</ThemedText>
      </Pressable>
    </View>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const isIncome = item.kind === 'income';

  return (
    <ThemedView type="surfaceContainer" style={styles.card}>
      <View style={styles.row}>
        <ThemedView
          type={isIncome ? 'secondaryContainer' : 'surfaceContainerHigh'}
          style={styles.icon}
        >
          <MaterialIcons
            name={isIncome ? 'payments' : 'receipt-long'}
            size={20}
            color={isIncome ? colors.primary : colors.onSurface}
          />
        </ThemedView>
        <View style={styles.details}>
          <ThemedText type="smallBold" numberOfLines={1}>{item.merchant}</ThemedText>
          <ThemedText
            type="small"
            themeColor={isIncome ? 'primary' : 'onSurfaceVariant'}
            numberOfLines={1}
          >
            {item.category} · {item.date}
          </ThemedText>
        </View>
        <ThemedText
          type="smallBold"
          themeColor={isIncome ? 'primary' : 'onSurface'}
          style={styles.amount}
        >
          {item.amount}
        </ThemedText>
      </View>
      {item.note && (
        <ThemedView type="surfaceContainerLow" style={styles.note}>
          <ThemedText type="small" themeColor="onSurfaceVariant" numberOfLines={2} style={styles.noteText}>
            {item.note}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

export default function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const loadActivity = useCallback(async () => {
    const currentRequest = ++requestVersion.current;
    void Promise.resolve().then(() => {
      if (currentRequest === requestVersion.current) {
        setError(null);
      }
    });
    try {
      const expenses = await getExpenses();
      if (currentRequest === requestVersion.current) {
        setItems(expenses.map(toActivityItem));
      }
    } catch (loadError) {
      if (currentRequest === requestVersion.current) {
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load recent activity.',
        );
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToExpenseUpdates(() => void loadActivity());
    void Promise.resolve().then(() => {
      if (active) {
        void loadActivity();
      }
    });
    return () => {
      active = false;
      requestVersion.current += 1;
      unsubscribe();
    };
  }, [loadActivity]);

  let content: ReactNode;
  if (error && items === null) {
    content = <ActivityError message={error} onRetry={() => void loadActivity()} />;
  } else if (items === null) {
    content = <ActivitySkeleton />;
  } else if (items.length === 0) {
    content = (
      <>
        {error && <ActivityError message={error} onRetry={() => void loadActivity()} />}
        <ThemedText type="small" themeColor="onSurfaceVariant">No recent activity yet.</ThemedText>
      </>
    );
  } else {
    content = (
      <>
        {error && <ActivityError message={error} onRetry={() => void loadActivity()} />}
        {items.map((item) => <ActivityCard key={item.id} item={item} />)}
      </>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.heading}>Recent Activity</ThemedText>
      <View
        style={styles.list}
        accessibilityLabel={items === null && !error ? 'Loading recent activity' : undefined}
        accessibilityRole={items === null && !error ? 'progressbar' : undefined}
      >
        {content}
      </View>
    </View>
  );
}

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
  noteText: { flex: 1   },
  errorContainer: { gap: spacing.xs },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonDetails: { flex: 1, gap: spacing.xs },
  skeletonBar: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
});
