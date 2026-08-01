function formatSyncTime(syncedAt) {
  return new Date(syncedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function SyncStatus({ syncedAt, loading }) {
  if (!syncedAt) {
    return null
  }

  return (
    <span
      className={`sync-status${loading ? ' sync-status--busy' : ''}`}
      aria-live="polite"
      // The server renders its own clock; the browser re-formats in local time.
      suppressHydrationWarning
    >
      <span className="sync-dot" aria-hidden="true" />
      {loading ? 'Syncing…' : `Live · synced ${formatSyncTime(syncedAt)}`}
    </span>
  )
}
