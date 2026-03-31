/**
 * NativeDataResultComponent — Displays a tool result card with title, summary, and data items.
 *
 * React Native equivalent of DataResultComponent from catalog/financial-extensions.tsx.
 * Uses nativewind className strings for styling.
 */

import { memo } from 'react'
import { View, Text } from 'react-native'
import type { A2UIComponentProps, DynamicString, DynamicValue } from '../../types'
import { useStringBinding, useDataBinding } from '../../renderer/hooks/use-data-binding'

interface NativeDataResultProps {
  title: DynamicString
  summary?: DynamicString
  items?: DynamicValue
}

export const NativeDataResultComponent = memo(function NativeDataResultComponent({
  surfaceId,
  title,
  summary,
  items,
  weight,
}: A2UIComponentProps<NativeDataResultProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const summaryText = useStringBinding(surfaceId, summary, '')
  const itemsData = useDataBinding<string[]>(surfaceId, items, [])

  return (
    <View
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={weight ? { flexGrow: weight } : undefined}
    >
      <Text className="text-base font-semibold text-foreground">{titleText}</Text>
      {summaryText !== '' && (
        <Text className="mt-1 text-sm text-muted-foreground">{summaryText}</Text>
      )}
      {itemsData.length > 0 && (
        <View className="mt-2 gap-1">
          {itemsData.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2">
              <View className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <Text className="text-sm text-foreground">{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
})

NativeDataResultComponent.displayName = 'A2UI.Native.DataResult'
