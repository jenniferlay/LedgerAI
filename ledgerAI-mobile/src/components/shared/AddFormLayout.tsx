import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import FormHeader, { FORM_HEADER_HEIGHT } from './FormHeader';

interface Props {
  title: string;
  actionLabel: string;
  actionAccessibilityLabel: string;
  actionScale?: number;
  contentTopSpacing?: number;
  onCancel?: () => void;
  onDone?: () => void;
  children: React.ReactNode;
}

export default function AddFormLayout({
  title,
  actionLabel,
  actionAccessibilityLabel,
  actionScale = 0.96,
  contentTopSpacing = 0,
  onCancel,
  onDone,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <FormHeader
        title={title}
        actionLabel={actionLabel}
        actionAccessibilityLabel={actionAccessibilityLabel}
        actionScale={actionScale}
        onCancel={onCancel}
        onDone={onDone}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop:
                FORM_HEADER_HEIGHT + insets.top + contentTopSpacing,
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.margin,
    gap: spacing.lg,
  },
});
