/**
 * NativeColumnComponent — A2UI Column (vertical flex) for React Native (Expo + nativewind).
 */

import { memo } from 'react'
import { View } from 'react-native'
import type {
  ColumnComponentProps,
  Justify,
  Align,
  A2UIComponentProps,
} from '../../types'
import { ComponentRenderer } from '../../renderer/components/component-renderer'

/**
 * Maps justify values to nativewind Tailwind classes.
 */
const justifyStyles: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  spaceBetween: 'justify-between',
  spaceAround: 'justify-around',
  spaceEvenly: 'justify-evenly',
  stretch: 'justify-stretch',
}

/**
 * Maps align values to nativewind Tailwind classes.
 */
const alignStyles: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

/**
 * Native Column component — vertical flex container.
 * Renders children via ComponentRenderer.
 */
export const NativeColumnComponent = memo(function NativeColumnComponent({
  surfaceId,
  children,
  justify = 'start',
  align = 'stretch',
}: A2UIComponentProps<ColumnComponentProps>) {
  const childIds = Array.isArray(children) ? children : []

  const className = `flex-col gap-2 ${justifyStyles[justify]} ${alignStyles[align]}`

  return (
    <View className={className}>
      {childIds.map((id) => (
        <ComponentRenderer key={id} surfaceId={surfaceId} componentId={id} />
      ))}
    </View>
  )
})

NativeColumnComponent.displayName = 'A2UI.Native.Column'
