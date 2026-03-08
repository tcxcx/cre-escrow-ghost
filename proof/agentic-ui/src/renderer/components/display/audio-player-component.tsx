/**
 * AudioPlayerComponent - Displays an audio player.
 */

import { memo } from 'react'
import type {
  AudioPlayerComponentProps,
  A2UIComponentProps,
} from '../../../types'
import { useStringBinding } from '../../hooks/use-data-binding'
import { cn } from '@bu/ui/utils'

/**
 * AudioPlayer component for playing audio content.
 */
export const AudioPlayerComponent = memo(function AudioPlayerComponent({
  surfaceId,
  url,
  description,
  weight,
}: A2UIComponentProps<AudioPlayerComponentProps>) {
  const audioUrl = useStringBinding(surfaceId, url, '')
  const descriptionText = useStringBinding(surfaceId, description, '')

  if (!audioUrl) {
    return null
  }

  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className={cn('flex flex-col gap-2')} style={style}>
      {descriptionText && (
        <p className="text-sm text-muted-foreground">{descriptionText}</p>
      )}
      <audio src={audioUrl} controls className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  )
})

AudioPlayerComponent.displayName = 'A2UI.AudioPlayer'
