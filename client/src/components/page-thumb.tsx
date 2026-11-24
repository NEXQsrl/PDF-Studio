import { useEffect, useRef, useState } from 'react'
import { FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getThumb } from '@/lib/pdf'

interface PageThumbProps {
  fileId: string
  /** 0-based page index */
  index: number
  rotation?: number
  className?: string
}

/** Fits a rotated page back inside its 3:4 frame. */
function fitScale(aspect: number, rotation: number) {
  if (rotation % 180 === 0) return 1
  const frame = 3 / 4
  return aspect < frame ? Math.min(frame, 1 / aspect) : Math.min(aspect, 1 / frame)
}

/** Page preview, rendered lazily the first time it scrolls near the viewport. */
export function PageThumb({ fileId, index, rotation = 0, className }: PageThumbProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [aspect, setAspect] = useState(3 / 4)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let cancelled = false
    setUrl(undefined)
    setFailed(false)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        getThumb(fileId, index).then(
          (thumb) => !cancelled && setUrl(thumb),
          () => !cancelled && setFailed(true),
        )
      },
      { rootMargin: '400px' },
    )
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [fileId, index])

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted',
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          className="max-h-full max-w-full bg-white object-contain shadow-sm transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${rotation}deg) scale(${fitScale(aspect, rotation)})` }}
        />
      ) : failed ? (
        <FileWarning className="size-5 text-muted-foreground" />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
      )}
    </div>
  )
}
