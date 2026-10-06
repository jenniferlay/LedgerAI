import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ParentCategory {
  id: string;
  label: string;
  icon: IconName;
}
