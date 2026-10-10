import React, { useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Platform,
  Pressable,
  Keyboard,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { getTodayIsoDate } from './validation';

const { colors, spacing, borderRadius, typography } = theme;

function isoToDate(iso: string): Date {
  if (!iso) {
    return new Date();
  }

  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isInteger)) {
    return new Date();
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date();
  }

  return date;
}

function dateToIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface Props {
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
}

export default function DateField({
  value,
  error,
  onChangeText,
  onBlur,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const colorScheme = useColorScheme();

  const handleFieldPress = () => {
    if (Platform.OS === 'ios' && showPicker) {
      setShowPicker(false);
      onBlur?.();
      return;
    }

    Keyboard.dismiss();
    setShowPicker(true);
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && date) {
        onChangeText(dateToIso(date));
      }
      onBlur?.();
      return;
    }

    if (date) {
      onChangeText(dateToIso(date));
      setShowPicker(false);
      onBlur?.();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Date</Text>

      <View
        style={[
          styles.container,
          showPicker && styles.containerFocused,
          Boolean(error) && styles.containerError,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Expense date ${value || 'not selected'}. Tap to change`}
          onPress={handleFieldPress}
          style={({ pressed }) => [
            styles.fieldPressable,
            pressed && styles.fieldPressablePressed,
          ]}
        >
          <MaterialIcons
            name="event"
            size={20}
            color={showPicker ? colors.primary : colors.outline}
            style={styles.icon}
          />
          <Text style={styles.input}>{value || 'Select a date'}</Text>
        </Pressable>
      </View>
      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={isoToDate(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={isoToDate(getTodayIsoDate())}
            accentColor={colors.primary}
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
            onChange={handlePickerChange}
          />
        </View>
      )}
      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  pickerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  containerFocused: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.primary,
  },
  containerError: {
    borderColor: colors.error,
  },
  fieldPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldPressablePressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.bodyLg,
    flex: 1,
    color: colors.onSurface,
    padding: 0,
    margin: 0,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
