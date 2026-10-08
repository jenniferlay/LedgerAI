import React, { useState } from 'react';
import { Alert } from 'react-native';
import AddFormLayout from '../../shared/AddFormLayout';
import PrimaryActionButton from '../../shared/PrimaryActionButton';
import { CategoryNameField, IconPreview, ParentCategoryRow } from './CategoryFields';
import IconGrid from './IconGrid';
import { PARENT_CATEGORIES, type IconName } from './data';

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
    <AddFormLayout
      title="Add Category"
      actionLabel="Done"
      actionAccessibilityLabel="Save Category"
      actionScale={0.95}
      onCancel={onCancel}
      onDone={handleDone}
    >
      <IconPreview icon={icon} />
      <CategoryNameField value={name} onChangeText={setName} />
      <ParentCategoryRow parent={parent} />
      <IconGrid selected={icon} onSelect={setIcon} />
      <PrimaryActionButton
        label="Create Category"
        accessibilityLabel="Create Category"
        icon="arrow-forward"
        onPress={handleDone}
      />
    </AddFormLayout>
  );
}
