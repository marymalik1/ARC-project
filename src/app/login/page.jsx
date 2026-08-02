import LoginForm from '../../components/LoginForm'

export const metadata = {
  title: 'Sign in — ARC Administration',
  description: 'Demo sign in for ARC farm intelligence administration',
}

export default async function LoginPage({ searchParams }) {
  const { error } = await searchParams
  const errorMessage =
    error === 'invalid'
      ? 'Invalid email or password.'
      : error === 'unavailable'
        ? 'Unable to sign in right now.'
        : ''

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="FMC Partner">
        <img src="/assets/fmc-partner.jpg" alt="FMC Partner — Growing Together" />
        <div>
          <p>Farm operations, made clearer.</p>
          <span>Administration portal</span>
        </div>
      </section>
      <section className="login-panel" aria-label="Demo account sign in">
        <div className="login-card">
          <p className="login-eyebrow">Welcome back</p>
          <h1>Sign in to your account</h1>
          <p className="login-intro">Access dealer management and customer support.</p>
          <LoginForm errorMessage={errorMessage} />
          <aside className="demo-credentials" aria-label="Sample credentials">
            <strong>Sample credentials</strong>
            <span>Email: <code>admin@arcfarm.com</code></span>
            <span>Password: <code>Arc@123</code></span>
          </aside>
        </div>
      </section>
    </main>
  )
}
