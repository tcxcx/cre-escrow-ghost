/**
 * NativeListComponent — A2UI List for React Native (Expo + nativewind).
 */

import { memo } from 'react'
import { View } from 'react-native'
import type {
  ListComponentProps,
  Align,
  A2UIComponentProps,
} from '../../types'
import { ComponentRenderer } from '../../renderer/components/component-renderer'

/**
 * Maps align values to nativewind Tailwind classes.
 */
const alignStyles: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

/**
 * Native List component — renders children in a vertical or horizontal layout.
 * Handles the string[] case of ChildList.
 */
export const NativeListComponent = memo(function NativeListComponent({
  surfaceId,
  children,
  direction = 'vertical',
  align = 'stretch',
}: A2UIComponentProps<ListComponentProps>) {
  const childIds = Array.isArray(children) ? children : []

  const directionClass = direction === 'horizontal' ? 'flex-row' : 'flex-col'
  const className = `${directionClass} gap-1 ${alignStyles[align]}`

  return (
    <View className={className}>
      {childIds.map((id) => (
        <ComponentRenderer key={id} surfaceId={surfaceId} componentId={id} />
      ))}
    </View>
  )
})

NativeListComponent.displayName = 'A2UI.Native.List'
