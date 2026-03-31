/**
 * SliderComponent - Slider input with two-way binding.
 */

import { memo, useCallback } from 'react'
import type { SliderComponentProps, A2UIComponentProps } from '../../../types'
import { useStringBinding, useFormBinding } from '../../hooks/use-data-binding'
import { useValidation } from '../../hooks/use-validation'
import { Slider } from '@bu/ui/slider'
import { Label } from '@bu/ui/label'
import { cn } from '@bu/ui/utils'

/**
 * Slider component - range slider input.
 */
export const SliderComponent = memo(function SliderComponent({
  surfaceId,
  componentId,
  label,
  min = 0,
  max = 100,
  value: valueProp,
  checks,
  weight,
}: A2UIComponentProps<SliderComponentProps>) {
  const labelText = useStringBinding(surfaceId, label, '')
  const { valid, errors } = useValidation(surfaceId, checks)

  const [sliderValue, setSliderValue] = useFormBinding<number>(
    surfaceId,
    valueProp,
    min
  )

  const handleChange = useCallback(
    (values: number[]) => {
      if (values.length > 0) {
        setSliderValue(values[0]!)
      }
    },
    [setSliderValue]
  )

  const id = `slider-${componentId}`

  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className={cn('flex flex-col gap-2 py-2')} style={style}>
      {labelText && <Label htmlFor={id}>{labelText}</Label>}
      <Slider
        id={id}
        value={[sliderValue]}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={1}
        aria-invalid={!valid}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground">{sliderValue}</span>
        <span>{max}</span>
      </div>
      {errors.length > 0 && (
        <div className="text-sm text-destructive">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}
    </div>
  )
})

SliderComponent.displayName = 'A2UI.Slider'
