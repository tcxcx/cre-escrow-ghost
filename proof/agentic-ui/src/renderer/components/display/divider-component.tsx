/**
 * DividerComponent - Displays a separator line.
 */

import { memo } from 'react'
import type { DividerComponentProps, A2UIComponentProps } from '../../../types'
import { Separator } from '@bu/ui/separator'

/**
 * Divider component for visual separation.
 */
export const DividerComponent = memo(function DividerComponent({
  axis = 'horizontal',
}: A2UIComponentProps<DividerComponentProps>) {
  return (
    <Separator
      orientation={axis}
      className={axis === 'vertical' ? 'self-stretch h-auto!' : 'w-full'}
    />
  )
})

DividerComponent.displayName = 'A2UI.Divider'
