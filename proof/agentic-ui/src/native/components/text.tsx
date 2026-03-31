/**
 * NativeTextComponent — A2UI Text for React Native (Expo + nativewind).
 */

import { memo } from 'react'
import { Text } from 'react-native'
import type { TextComponentProps, A2UIComponentProps } from '../../types'
import { useStringBinding } from '../../renderer/hooks/use-data-binding'

/**
 * Maps variant to nativewind Tailwind classes.
 */
const variantStyles: Record<string, string> = {
  h1: 'text-2xl font-bold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-medium',
  h5: 'text-sm font-medium',
  caption: 'text-xs text-gray-500',
  body: 'text-sm',
}

/**
 * Native Text component for displaying text content.
 * Supports different text styles via variant.
 */
export const NativeTextComponent = memo(function NativeTextComponent({
  surfaceId,
  text,
  variant = 'body',
}: A2UIComponentProps<TextComponentProps>) {
  const resolved = useStringBinding(surfaceId, text, '')

  const variantClass = variantStyles[variant] || variantStyles.body

  return <Text className={variantClass}>{resolved}</Text>
})

NativeTextComponent.displayName = 'A2UI.Native.Text'
