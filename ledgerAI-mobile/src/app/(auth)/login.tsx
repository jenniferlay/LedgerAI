import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import appIcon from '@/assets/images/icon.png';
import theme from '@/constants/theme';
import { useAuth } from '@/context/auth';
import LoginForm, { type AuthFormProps } from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { logIn, signUp } from '@/services/auth-api';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'username' | 'password' | 'confirmPassword' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (!isLogin && !username.trim()) {
      setError('Please enter your username.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (!isLogin) {
        try {
          await signUp(email.trim(), username.trim(), password);
          setSuccessMessage('Account created successfully. Please sign in from the Login tab.');
          setPassword('');
          setIsLogin(true);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Please try again.';
          setError(`Could not create your account: ${message}`);
        }
        return;
      }

      const result = await logIn(email.trim(), password);
      await signIn(result.access_token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      setError(`Could not sign in: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formProps: AuthFormProps = {
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    focusedField,
    setFocusedField,
    error,
    isSubmitting,
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
              <Image
                source={appIcon}
                style={styles.logoImage}
                resizeMode="contain"
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
                    setPassword('');
                    setShowPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {successMessage && (
            <View style={styles.successBox} accessibilityRole="alert">
              <MaterialIcons name="check-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

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
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#1a2230',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(145, 255, 227, 0.5)',
    shadowColor: '#5de4c7',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainer,
    marginBottom: theme.spacing.md,
  },
  successText: {
    flex: 1,
    ...theme.typography.bodySm,
    color: theme.colors.primary,
  },
});
