/**
 * NativeApprovalCardComponent — HITL approval UI with approve/reject buttons.
 *
 * React Native equivalent of ApprovalCardComponent from catalog/financial-extensions.tsx.
 * Uses nativewind className strings for styling.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { A2UIComponentProps, DynamicString, Action } from '../../types'
import { useStringBinding } from '../../renderer/hooks/use-data-binding'
import { useDispatchAction } from '../../renderer/hooks/use-dispatch-action'

interface NativeApprovalCardProps {
  title: DynamicString
  description: DynamicString
  approveLabel?: DynamicString
  rejectLabel?: DynamicString
  approveAction: Action
  rejectAction: Action
}

export const NativeApprovalCardComponent = memo(function NativeApprovalCardComponent({
  surfaceId,
  componentId,
  title,
  description,
  approveLabel,
  rejectLabel,
  approveAction,
  rejectAction,
  weight,
}: A2UIComponentProps<NativeApprovalCardProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const descriptionText = useStringBinding(surfaceId, description, '')
  const approveLabelText = useStringBinding(surfaceId, approveLabel, 'Approve')
  const rejectLabelText = useStringBinding(surfaceId, rejectLabel, 'Reject')

  const dispatchAction = useDispatchAction()

  const handleApprove = useCallback(() => {
    if (approveAction) {
      dispatchAction(surfaceId, componentId, approveAction)
    }
  }, [dispatchAction, surfaceId, componentId, approveAction])

  const handleReject = useCallback(() => {
    if (rejectAction) {
      dispatchAction(surfaceId, componentId, rejectAction)
    }
  }, [dispatchAction, surfaceId, componentId, rejectAction])

  return (
    <View
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={weight ? { flexGrow: weight } : undefined}
    >
      <Text className="text-base font-semibold text-foreground">{titleText}</Text>
      <Text className="mt-1 text-sm text-muted-foreground">{descriptionText}</Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={handleApprove}
          className="rounded-md bg-green-600 px-3 py-1.5 active:bg-green-700"
        >
          <Text className="text-sm font-medium text-white">{approveLabelText}</Text>
        </Pressable>
        <Pressable
          onPress={handleReject}
          className="rounded-md border border-border bg-destructive px-3 py-1.5 active:bg-red-700"
        >
          <Text className="text-sm font-medium text-white">{rejectLabelText}</Text>
        </Pressable>
      </View>
    </View>
  )
})

NativeApprovalCardComponent.displayName = 'A2UI.Native.ApprovalCard'
