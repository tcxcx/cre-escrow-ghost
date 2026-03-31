/**
 * CheckBoxComponent - Checkbox input with two-way binding.
 */

import { memo, useCallback } from 'react'
import type { CheckBoxComponentProps, A2UIComponentProps } from '../../../types'
import { useStringBinding, useFormBinding } from '../../hooks/use-data-binding'
import { useValidation } from '../../hooks/use-validation'
import { useScopeBasePath } from '../../contexts/scope-context'
import { Checkbox } from '@bu/ui/checkbox'
import { Label } from '@bu/ui/label'
import { cn } from '@bu/ui/utils'

/**
 * CheckBox component - checkbox input with label.
 */
export const CheckBoxComponent = memo(function CheckBoxComponent({
  surfaceId,
  componentId,
  label,
  value: valueProp,
  checks,
  weight,
}: A2UIComponentProps<CheckBoxComponentProps>) {
  const labelText = useStringBinding(surfaceId, label, '')
  const [checked, setChecked] = useFormBinding<boolean>(
    surfaceId,
    valueProp,
    false
  )
  const { valid, errors } = useValidation(surfaceId, checks)
  const basePath = useScopeBasePath()

  const handleChange = useCallback(
    (newChecked: boolean) => {
      setChecked(newChecked)
    },
    [setChecked]
  )

  // Include basePath in ID to ensure uniqueness in templated lists
  const id = basePath
    ? `checkbox-${componentId}-${basePath.replace(/\//g, '-')}`
    : `checkbox-${componentId}`

  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className={cn('flex flex-col gap-1')} style={style}>
      <div className="flex items-center gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={handleChange}
          aria-invalid={!valid}
        />
        {labelText && (
          <Label htmlFor={id} className="cursor-pointer">
            {labelText}
          </Label>
        )}
      </div>
      {errors.length > 0 && (
        <div className="text-sm text-destructive ml-6">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}
    </div>
  )
})

CheckBoxComponent.displayName = 'A2UI.CheckBox'
