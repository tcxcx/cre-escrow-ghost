/**
 * VideoComponent - Displays video content.
 */

import { memo } from 'react'
import type { VideoComponentProps, A2UIComponentProps } from '../../../types'
import { useStringBinding } from '../../hooks/use-data-binding'
import { cn } from '@bu/ui/utils'

/**
 * Video component for displaying video content.
 */
export const VideoComponent = memo(function VideoComponent({
  surfaceId,
  url,
  weight,
}: A2UIComponentProps<VideoComponentProps>) {
  const videoUrl = useStringBinding(surfaceId, url, '')

  if (!videoUrl) {
    return null
  }

  // Apply weight as flex-grow if set
  const style = weight ? { flexGrow: weight } : undefined

  return (
    <video
      src={videoUrl}
      controls
      className={cn('w-full rounded-lg')}
      style={style}
    >
      <track kind="captions" />
      Your browser does not support the video tag.
    </video>
  )
})

VideoComponent.displayName = 'A2UI.Video'
