/**
 * NativeMetricCardComponent — Displays a financial KPI with optional trend and confidence.
 *
 * React Native equivalent of MetricCardComponent from catalog/financial-extensions.tsx.
 * Uses nativewind className strings for styling.
 */

import { memo } from 'react'
import { View, Text } from 'react-native'
import type { A2UIComponentProps, DynamicString } from '../../types'
import { useStringBinding } from '../../renderer/hooks/use-data-binding'

interface NativeMetricCardProps {
  label: DynamicString
  value: DynamicString
  trend?: DynamicString
  confidence?: DynamicString
}

const confidenceStyles: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-red-600',
}

export const NativeMetricCardComponent = memo(function NativeMetricCardComponent({
  surfaceId,
  label,
  value,
  trend,
  confidence,
  weight,
}: A2UIComponentProps<NativeMetricCardProps>) {
  const labelText = useStringBinding(surfaceId, label, '')
  const valueText = useStringBinding(surfaceId, value, '')
  const trendText = useStringBinding(surfaceId, trend, '')
  const confidenceText = useStringBinding(surfaceId, confidence, '')

  const trendIsPositive = trendText.startsWith('+') || trendText.toLowerCase().includes('up')
  const trendIsNegative = trendText.startsWith('-') || trendText.toLowerCase().includes('down')

  return (
    <View
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={weight ? { flexGrow: weight } : undefined}
    >
      <Text className="text-sm text-muted-foreground">{labelText}</Text>
      <Text className="mt-1 text-2xl font-bold text-foreground">{valueText}</Text>
      {trendText !== '' && (
        <Text
          className={`mt-1 text-sm ${
            trendIsPositive
              ? 'text-green-600'
              : trendIsNegative
                ? 'text-red-600'
                : 'text-muted-foreground'
          }`}
        >
          {trendText}
        </Text>
      )}
      {confidenceText !== '' && (
        <Text
          className={`mt-1 text-xs ${
            confidenceStyles[confidenceText.toLowerCase()] ?? 'text-muted-foreground'
          }`}
        >
          Confidence: {confidenceText}
        </Text>
      )}
    </View>
  )
})

NativeMetricCardComponent.displayName = 'A2UI.Native.MetricCard'
