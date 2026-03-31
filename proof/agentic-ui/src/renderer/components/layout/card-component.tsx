/**
 * CardComponent - Card container.
 */

import { memo } from 'react'
import type { CardComponentProps, A2UIComponentProps } from '../../../types'
import { Card, CardContent } from '@bu/ui/card'
import { ComponentRenderer } from '../component-renderer'

/**
 * Card component - container with card styling.
 */
export const CardComponent = memo(function CardComponent({
  surfaceId,
  child,
  weight,
}: A2UIComponentProps<CardComponentProps>) {
  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  if (!child) {
    return <Card style={style} />
  }

  return (
    <Card style={style}>
      <CardContent className="p-4">
        <ComponentRenderer surfaceId={surfaceId} componentId={child} />
      </CardContent>
    </Card>
  )
})

CardComponent.displayName = 'A2UI.Card'
