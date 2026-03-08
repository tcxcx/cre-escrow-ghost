/**
 * useDispatchAction - Hook for dispatching actions from components.
 */

import { useCallback } from 'react'
import type { Action, DataModel } from '../../types'
import { useActionContext } from '../contexts/action-context'
import { useSurfaceContext } from '../contexts/surface-context'
import { useScope } from '../contexts/scope-context'

/**
 * Returns a function to dispatch actions.
 *
 * @returns A function that dispatches actions
 *
 * @example
 * ```tsx
 * function ButtonComponent({ surfaceId, component }) {
 *   const dispatchAction = useDispatchAction();
 *
 *   const handleClick = () => {
 *     if (component.action) {
 *       dispatchAction(surfaceId, component.id, component.action);
 *     }
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useDispatchAction(): (
  surfaceId: string,
  componentId: string,
  action: Action
) => void {
  const { dispatchAction } = useActionContext()
  const { getDataModel } = useSurfaceContext()
  const { basePath } = useScope()

  return useCallback(
    (surfaceId: string, componentId: string, action: Action) => {
      const dataModel: DataModel = getDataModel(surfaceId)
      dispatchAction(surfaceId, componentId, action, dataModel, basePath)
    },
    [dispatchAction, getDataModel, basePath]
  )
}
