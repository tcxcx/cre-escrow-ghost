/**
 * NativeStepProgressComponent — Displays a workflow step progress indicator.
 *
 * React Native equivalent of StepProgressComponent from catalog/financial-extensions.tsx.
 * Uses nativewind className strings for styling.
 */

import { memo } from 'react'
import { View, Text } from 'react-native'
import type {
  A2UIComponentProps,
  DynamicString,
  DynamicValue,
  DynamicNumber,
} from '../../types'
import { useStringBinding, useDataBinding } from '../../renderer/hooks/use-data-binding'

interface NativeStepProgressProps {
  title?: DynamicString
  steps: DynamicValue
  currentStep?: DynamicNumber
}

export const NativeStepProgressComponent = memo(function NativeStepProgressComponent({
  surfaceId,
  title,
  steps,
  currentStep,
  weight,
}: A2UIComponentProps<NativeStepProgressProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const stepsData = useDataBinding<string[]>(surfaceId, steps, [])
  const current = useDataBinding<number>(surfaceId, currentStep, 0)

  return (
    <View
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={weight ? { flexGrow: weight } : undefined}
    >
      {titleText !== '' && (
        <Text className="mb-3 text-base font-semibold text-foreground">{titleText}</Text>
      )}
      <View className="gap-2">
        {stepsData.map((step, index) => {
          const isComplete = index < current
          const isCurrent = index === current

          return (
            <View key={index} className="flex-row items-center gap-2">
              <View
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isComplete
                    ? 'bg-primary'
                    : isCurrent
                      ? 'border-2 border-primary'
                      : 'border border-muted-foreground/30'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isComplete
                      ? 'text-primary-foreground'
                      : isCurrent
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {isComplete ? '\u2713' : String(index + 1)}
                </Text>
              </View>
              <Text
                className={`text-sm ${
                  isComplete
                    ? 'text-foreground'
                    : isCurrent
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {step}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
})

NativeStepProgressComponent.displayName = 'A2UI.Native.StepProgress'
