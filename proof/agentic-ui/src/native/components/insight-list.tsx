/**
 * NativeInsightListComponent — Displays a list of AI-generated insights.
 *
 * React Native equivalent of InsightListComponent from catalog/financial-extensions.tsx.
 * Uses nativewind className strings for styling.
 */

import { memo } from 'react'
import { View, Text } from 'react-native'
import type { A2UIComponentProps, DynamicString, DynamicValue } from '../../types'
import { useStringBinding, useDataBinding } from '../../renderer/hooks/use-data-binding'

interface NativeInsightListProps {
  title?: DynamicString
  insights: DynamicValue
}

export const NativeInsightListComponent = memo(function NativeInsightListComponent({
  surfaceId,
  title,
  insights,
  weight,
}: A2UIComponentProps<NativeInsightListProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const insightsData = useDataBinding<string[]>(surfaceId, insights, [])

  return (
    <View
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={weight ? { flexGrow: weight } : undefined}
    >
      {titleText !== '' && (
        <Text className="mb-2 text-base font-semibold text-foreground">{titleText}</Text>
      )}
      {insightsData.length > 0 ? (
        <View className="gap-2">
          {insightsData.map((insight, index) => (
            <View key={index} className="flex-row items-start gap-2">
              <Text className="mt-0.5 text-primary">{'\u2728'}</Text>
              <Text className="text-sm text-foreground">{insight}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">No insights available.</Text>
      )}
    </View>
  )
})

NativeInsightListComponent.displayName = 'A2UI.Native.InsightList'
