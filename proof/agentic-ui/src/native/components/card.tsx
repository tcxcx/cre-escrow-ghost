/**
 * NativeCardComponent — A2UI Card for React Native (Expo + nativewind).
 */

import { memo } from 'react'
import { View } from 'react-native'
import type { CardComponentProps, A2UIComponentProps } from '../../types'
import { ComponentRenderer } from '../../renderer/components/component-renderer'

/**
 * Native Card component — container with card styling.
 */
export const NativeCardComponent = memo(function NativeCardComponent({
  surfaceId,
  child,
}: A2UIComponentProps<CardComponentProps>) {
  return (
    <View className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      {child && (
        <ComponentRenderer surfaceId={surfaceId} componentId={child} />
      )}
    </View>
  )
})

NativeCardComponent.displayName = 'A2UI.Native.Card'
