import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../constants/theme';

export interface AuthFormProps {
  email: string;
  setEmail: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  focusedField: 'email' | 'username' | 'password' | 'confirmPassword' | null;
  setFocusedField: (value: 'email' | 'username' | 'password' | 'confirmPassword' | null) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  focusedField,
  setFocusedField,
  error,
  isSubmitting,
  onSubmit,
}: AuthFormProps) {
  return (
    <View style={styles.form}>
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
            color={focusedField === 'email' ? theme.colors.primary : theme.colors.outline}
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

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Password</Text>
          <Pressable onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
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
            color={focusedField === 'password' ? theme.colors.primary : theme.colors.outline}
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
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={theme.colors.outline}
            />
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <MaterialIcons name="error-outline" size={18} color={theme.colors.errorText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
          isSubmitting && styles.submitBtnDisabled,
        ]}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>{isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
        <MaterialIcons
          name="arrow-forward"
          size={20}
          color={theme.colors.onPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  errorText: {
    flex: 1,
    ...theme.typography.bodySm,
    color: theme.colors.errorText,
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
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    ...theme.typography.labelLg,
    color: theme.colors.onPrimary,
  },
});
