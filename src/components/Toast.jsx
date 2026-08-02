import { CircleAlert, CircleCheck, Loader } from 'lucide-react'
import { useEffect } from 'react'

const icons = {
  busy: Loader,
  success: CircleCheck,
  error: CircleAlert,
}

/**
 * Transient status message. A `busy` toast stays until it is replaced — the work
 * it reports is still running — while success and error dismiss themselves.
 */
export default function Toast({ toast, onDismiss, duration = 4000 }) {
  const tone = toast?.tone ?? 'success'

  useEffect(() => {
    if (!toast || tone === 'busy') {
      return undefined
    }

    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, tone, onDismiss, duration])

  if (!toast) {
    return null
  }

  const Icon = icons[tone] ?? CircleCheck

  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <Icon className={tone === 'busy' ? 'toast-spin' : undefined} size={18} aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  )
}
