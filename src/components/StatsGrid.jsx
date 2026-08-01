import { emptyStats, formatCount, statColumns } from '../lib/dealers'

function UserMetricIcon({ type }) {
  const marker =
    type === 'active' ? (
      <path d="m45 43 4 4 8-9" />
    ) : type === 'inactive' ? (
      <>
        <path d="m47 39 9 9" />
        <path d="m56 39-9 9" />
      </>
    ) : type === 'new' ? (
      <>
        <path d="M51.5 38v11" />
        <path d="M46 43.5h11" />
      </>
    ) : null

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {type === 'all' ? (
        <>
          <circle cx="25" cy="22" r="8" fill="currentColor" />
          <circle cx="42" cy="24" r="7" fill="currentColor" />
          <path d="M11 49c0-10 5-16 14-16s14 6 14 16v4H11z" fill="currentColor" />
          <path d="M39 37c9 0 14 5 14 14v2H42v-4c0-5-1-9-4-12z" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="27" cy="22" r="10" fill="currentColor" />
          <path d="M9 52c0-12 7-19 18-19s18 7 18 19v3H9z" fill="currentColor" />
          <circle cx="51.5" cy="43.5" r="11.5" fill="#d20d12" stroke="#fff" strokeWidth="2" />
          <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {marker}
          </g>
        </>
      )}
    </svg>
  )
}

export default function StatsGrid({ stats = emptyStats }) {
  return (
    <section className="stats-grid" aria-label="Account overview">
      {statColumns.map((stat) => (
        <article className="stat-card" key={stat.key}>
          <div className="stat-icon">
            <UserMetricIcon type={stat.icon} />
          </div>
          <div className="stat-copy">
            <h2>{stat.label}</h2>
            <strong aria-live="polite">{formatCount(stats[stat.key])}</strong>
            <span>Total</span>
          </div>
        </article>
      ))}
    </section>
  )
}
