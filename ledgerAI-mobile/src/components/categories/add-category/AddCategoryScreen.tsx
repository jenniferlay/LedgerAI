import React, { useState } from 'react';
import { Alert } from 'react-native';
import AddFormLayout from '@/components/shared/AddFormLayout';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import { CategoryNameField, IconPreview } from './CategoryFields';
import { ParentCategoryDropdown } from './ParentCategoryDropdown';
import IconGrid from './IconGrid';
import type { IconName } from './data';
import { createCategory } from '@/services/categories-api';

export interface CategoryDraft {
  name: string;
  icon: IconName;
  parentCategoryId: number | null;
}

interface Props {
  onCancel?: () => void;
  onDone?: (category: CategoryDraft) => void;
}

export default function AddCategoryScreen({ onCancel, onDone }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('local-cafe');
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDone = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Category name required', 'Enter a name before creating a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCategory({
        name: trimmedName,
        icon,
        parent_categoryid: parentCategoryId,
      });

      const categoryDraft: CategoryDraft = {
        name: created.name,
        icon: (created.icon as IconName) ?? icon,
        parentCategoryId: created.parent_categoryid,
      };

      if (onDone) {
        onDone(categoryDraft);
      } else {
        Alert.alert(
          'Category Created',
          `Successfully created category "${created.name}".`,
          [{ text: 'OK', onPress: onCancel }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to Create Category',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AddFormLayout
      title="Add Category"
      onCancel={onCancel}
    >
      <IconPreview icon={icon} />
      <CategoryNameField value={name} onChangeText={setName} />
      <ParentCategoryDropdown selectedParentId={parentCategoryId} onSelect={setParentCategoryId} />
      <IconGrid selected={icon} onSelect={setIcon} />
      <PrimaryActionButton
        label="Create Category"
        accessibilityLabel="Create Category"
        icon="arrow-forward"
        onPress={handleDone}
        isLoading={isSubmitting}
      />
    </AddFormLayout>
  );
}
