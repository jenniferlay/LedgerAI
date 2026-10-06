import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  scale?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function PressableScale({
  scale = 0.96,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && { transform: [{ scale }] }]}
    >
      {children}
    </Pressable>
  );
}
