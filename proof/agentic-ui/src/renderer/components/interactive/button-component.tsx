/**
 * ButtonComponent - Clickable button that triggers actions.
 */

import { memo, useCallback } from 'react'
import type { ButtonComponentProps, A2UIComponentProps } from '../../../types'
import { useDispatchAction } from '../../hooks/use-dispatch-action'
import { useValidation } from '../../hooks/use-validation'
import { Button } from '@bu/ui/button'
import { ComponentRenderer } from '../component-renderer'

/**
 * Button component - triggers actions on click.
 * When checks are defined and fail, the button is disabled.
 */
export const ButtonComponent = memo(function ButtonComponent({
  surfaceId,
  componentId,
  child,
  primary = false,
  action,
  checks,
  weight,
}: A2UIComponentProps<ButtonComponentProps>) {
  const dispatchAction = useDispatchAction()
  const { valid } = useValidation(surfaceId, checks)

  const handleClick = useCallback(() => {
    if (action) {
      dispatchAction(surfaceId, componentId, action)
    }
  }, [dispatchAction, surfaceId, componentId, action])

  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  // Disable button if checks fail
  const isDisabled = !valid

  return (
    <Button
      variant={primary ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={isDisabled}
      className="inline-flex items-center justify-center"
      style={style}
    >
      {child ? (
        <ComponentRenderer surfaceId={surfaceId} componentId={child} />
      ) : (
        'Button'
      )}
    </Button>
  )
})

ButtonComponent.displayName = 'A2UI.Button'
