'use client'

import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'

export default function LoginForm({ errorMessage = '' }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="login-form" action="/api/demo-auth/login" method="post">
      {errorMessage && (
        <p className="login-error" role="alert">{errorMessage}</p>
      )}
      <label htmlFor="login-email">Email address</label>
      <div className="login-input">
        <Mail aria-hidden="true" />
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Enter your email"
          required
        />
      </div>
      <label htmlFor="login-password">Password</label>
      <div className="login-input">
        <LockKeyhole aria-hidden="true" />
        <input
          id="login-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      <button className="login-submit" type="submit">Sign in</button>
    </form>
  )
}
