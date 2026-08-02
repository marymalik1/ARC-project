export default function ArcLogo() {
  return (
    <div className="arc-logo">
      <img
        className="arc-logo-image"
        src="/assets/fmc-partner.jpg"
        alt="FMC Partner — Growing Together"
      />
      {/* Swapped in for the full lockup once the sidebar collapses to a rail. */}
      <img className="arc-logo-mark" src="/assets/fmc-partner-mark.jpg" alt="" aria-hidden="true" />
    </div>
  )
}
