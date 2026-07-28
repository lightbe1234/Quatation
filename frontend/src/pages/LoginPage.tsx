import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import bmsHeader from '../assets/bms-company-header.png'
import { useAuth } from '../auth/useAuth'
import { Button, StatusMessage } from '../components/ui'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const location = useLocation()
  const { error, signIn, user } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [localError, setLocalError] = useState<string>()
  const from =
    (location.state as LocationState | null)?.from?.pathname ?? '/'

  if (user) {
    return <Navigate replace to={from} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(undefined)
    setIsSigningIn(true)

    try {
      await signIn(identifier, password)
    } catch {
      setLocalError('Email or password is incorrect.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-950/10">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4">
            <img
              alt="Bluestar Modern Solutions Company"
              className="max-h-20 w-full object-contain"
              src={bmsHeader}
            />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-bms-blue">
            BMS Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Sign in
          </h1>
        </div>

        {(localError || error) && (
          <div className="mt-6">
            <StatusMessage tone="error">
              {localError ?? error}
            </StatusMessage>
          </div>
        )}

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Email or username
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-bms-blue focus:ring-2 focus:ring-blue-100"
              disabled={isSigningIn}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="shahab"
              required
              value={identifier}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-bms-blue focus:ring-2 focus:ring-blue-100"
              disabled={isSigningIn}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <Button className="w-full" disabled={isSigningIn} type="submit">
            {isSigningIn ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  )
}
