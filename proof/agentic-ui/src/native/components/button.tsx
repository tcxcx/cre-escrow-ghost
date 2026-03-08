/**
 * NativeButtonComponent — A2UI Button for React Native (Expo + nativewind).
 */

import { memo, useCallback } from 'react'
import { Pressable } from 'react-native'
import type { ButtonComponentProps, A2UIComponentProps } from '../../types'
import { useDispatchAction } from '../../renderer/hooks/use-dispatch-action'
import { ComponentRenderer } from '../../renderer/components/component-renderer'

/**
 * Native Button component — triggers actions on press.
 */
export const NativeButtonComponent = memo(function NativeButtonComponent({
  surfaceId,
  componentId,
  child,
  primary = false,
  action,
}: A2UIComponentProps<ButtonComponentProps>) {
  const dispatchAction = useDispatchAction()

  const handlePress = useCallback(() => {
    if (action) {
      dispatchAction(surfaceId, componentId, action)
    }
  }, [dispatchAction, surfaceId, componentId, action])

  const className = primary
    ? 'rounded-lg bg-blue-600 px-4 py-2 items-center justify-center'
    : 'rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 items-center justify-center'

  return (
    <Pressable onPress={handlePress} className={className}>
      {child && (
        <ComponentRenderer surfaceId={surfaceId} componentId={child} />
      )}
    </Pressable>
  )
})

NativeButtonComponent.displayName = 'A2UI.Native.Button'
