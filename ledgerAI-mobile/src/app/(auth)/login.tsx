import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../constants/theme';
import LoginForm, { type AuthFormProps } from '../../components/auth/LoginForm';
import SignupForm from '../../components/auth/SignupForm';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'name' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(
      isLogin
        ? 'Invalid email or password. Please try again.'
        : 'Unable to create account. Please check your details.'
    );
  };

  const formProps: AuthFormProps = {
    email,
    setEmail,
    name,
    setName,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    focusedField,
    setFocusedField,
    error,
    onSubmit: handleSubmit,
  };

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
            <Text style={styles.subtitle}>Your Wealth, your way.</Text>
          </View>

          <View style={styles.tabBar}>
            {(['Login', 'Sign Up'] as const).map((label, idx) => {
              const active = isLogin ? idx === 0 : idx === 1;
              return (
                <Pressable
                  key={label}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => {
                    setIsLogin(label === 'Login');
                    setError(null);
                  }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLogin ? (
            <LoginForm {...formProps} />
          ) : (
            <SignupForm {...formProps} />
          )}
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
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.xxl,
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
});
