import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../constants/theme';
import type { AuthFormProps } from './LoginForm';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getValidationError(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }

  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return 'Password must be at least 8 characters and include uppercase and lowercase letters and a number.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return null;
}

export default function SignupForm({
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
  onSubmit,
}: AuthFormProps) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    const nextError = getValidationError(email, password, confirmPassword);
    setValidationError(nextError);

    if (!nextError) {
      onSubmit();
    }
  };

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
            onChangeText={(value) => {
              setEmail(value);
              setValidationError(null);
            }}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Name</Text>
        <View
          style={[
            styles.inputBox,
            focusedField === 'name' && styles.inputBoxFocused,
          ]}
        >
          <MaterialIcons
            name="person-outline"
            size={20}
            color={focusedField === 'name' ? theme.colors.primary : theme.colors.outline}
          />
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={theme.colors.outline}
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
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
            onChangeText={(value) => {
              setPassword(value);
              setValidationError(null);
            }}
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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm password</Text>
        <View
          style={[
            styles.inputBox,
            focusedField === 'confirmPassword' && styles.inputBoxFocused,
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={20}
            color={focusedField === 'confirmPassword' ? theme.colors.primary : theme.colors.outline}
          />
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor={theme.colors.outline}
            secureTextEntry
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setValidationError(null);
            }}
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      {(validationError || error) && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <MaterialIcons name="error-outline" size={18} color={theme.colors.errorText} />
          <Text style={styles.errorText}>{validationError || error}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
        ]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Sign Up</Text>
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
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
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
  submitText: {
    ...theme.typography.labelLg,
    color: theme.colors.onPrimary,
  },
});
