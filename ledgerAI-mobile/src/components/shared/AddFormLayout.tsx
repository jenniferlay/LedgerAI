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
  contentTopSpacing?: number;
  onCancel?: () => void;
  children: React.ReactNode;
}

export default function AddFormLayout({
  title,
  contentTopSpacing = 0,
  onCancel,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <FormHeader title={title} onCancel={onCancel} />
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
