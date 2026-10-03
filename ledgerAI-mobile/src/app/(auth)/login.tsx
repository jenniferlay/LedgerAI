import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const handleSubmit = () => router.replace('/(app)');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Logo Placeholder */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <MaterialIcons
                name="account-balance-wallet"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Ledger</Text>
              <Text style={[styles.title, styles.titleAccent]}>AI</Text>
            </View>
            <Text style={styles.subtitle}>
              Your Wealth, your way.
            </Text>
          </View>

          {/* Segmented Mode Switcher */}
          <View style={styles.tabBar}>
            {(['Login', 'Sign Up'] as const).map((label, idx) => {
              const active = isLogin ? idx === 0 : idx === 1;
              return (
                <Pressable
                  key={label}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setIsLogin(idx === 0)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedField === 'email' && styles.inputBoxFocused,
                ]}
              >
                <MaterialIcons
                  name="alternate-email"
                  size={20}
                  color={
                    focusedField === 'email'
                      ? theme.colors.primary
                      : theme.colors.outline
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                {isLogin && (
                  <Pressable onPress={() => {}}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                )}
              </View>
              <View
                style={[
                  styles.inputBox,
                  focusedField === 'password' && styles.inputBoxFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={
                    focusedField === 'password'
                      ? theme.colors.primary
                      : theme.colors.outline
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor={theme.colors.outline}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.colors.outline}
                  />
                </Pressable>
              </View>
            </View>

            {/* Primary CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={theme.colors.onPrimary}
              />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.margin,
    paddingBottom: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    ...theme.typography.headlineLgMobile,
    color: theme.colors.onSurface,
  },
  titleAccent: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainerLowest,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  form: {
    gap: theme.spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
  },
  forgotText: {
    ...theme.typography.labelSm,
    color: theme.colors.primary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  inputBoxFocused: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...theme.typography.bodyMd,
    color: theme.colors.onSurface,
  },
  submitBtn: {
    marginTop: theme.spacing.xs,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnPressed: {
    backgroundColor: theme.colors.tertiary,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    ...theme.typography.labelLg,
    color: theme.colors.onPrimary,
  },
});