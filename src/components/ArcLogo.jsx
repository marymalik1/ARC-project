function ArcMark() {
  return (
    <svg className="arc-mark" viewBox="0 0 72 72" aria-hidden="true">
      <defs>
        <linearGradient id="arcRed" x1="0" x2="1">
          <stop offset="0" stopColor="#ef1619" />
          <stop offset="1" stopColor="#aa0005" />
        </linearGradient>
      </defs>
      <path
        d="M61 16A30 30 0 1 0 58 58l-9-10a18 18 0 1 1 2-25z"
        fill="url(#arcRed)"
      />
      <path d="M31 51 43 25h10l12 26H54l-6-14-6 14z" fill="#fff" />
      <path d="m27 51 12-20 6 10-6 10z" fill="#fff" />
    </svg>
  )
}

export default function ArcLogo() {
  return (
    <div className="arc-logo" aria-label="ARC">
      <ArcMark />
      <span>ARC</span>
    </div>
  )
}
