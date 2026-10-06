import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../../constants/theme';
import Header, { HEADER_HEIGHT } from './Header';
import { CategoryNameField, IconPreview, ParentCategoryRow } from './CategoryFields';
import IconGrid from './IconGrid';
import CreateButton from './CreateButton';
import { PARENT_CATEGORIES, type IconName } from './data';

const { colors, spacing } = theme;

export interface CategoryDraft {
  name: string;
  icon: IconName;
  parentCategoryId: string;
}

interface Props {
  onCancel?: () => void;
  onDone?: (category: CategoryDraft) => void;
}

export default function AddCategoryScreen({ onCancel, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('Coffee & Roasts');
  const [icon, setIcon] = useState<IconName>('local-cafe');

  const parent = PARENT_CATEGORIES[0];

  const handleDone = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Category name required', 'Enter a name before creating a category.');
      return;
    }

    if (!onDone) {
      Alert.alert(
        'Category not saved',
        'Category creation is not connected to the backend yet.',
      );
      return;
    }

    onDone({
      name: trimmedName,
      icon,
      parentCategoryId: parent.id,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Header onCancel={onCancel} onDone={handleDone} />
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
              paddingTop: HEADER_HEIGHT + insets.top,
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <IconPreview icon={icon} />
          <CategoryNameField value={name} onChangeText={setName} />
          <ParentCategoryRow parent={parent} />
          <IconGrid selected={icon} onSelect={setIcon} />
          <CreateButton onPress={handleDone} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.margin,
    gap: spacing.lg,
  },
});
