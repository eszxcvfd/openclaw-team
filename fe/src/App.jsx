import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState({ state: 'loading', data: null, error: '' })

  useEffect(() => {
    let ignore = false

    async function loadStatus() {
      try {
        const response = await fetch('/api/health')

        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`)
        }

        const data = await response.json()

        if (!ignore) {
          setStatus({ state: 'ready', data, error: '' })
        }
      } catch (error) {
        if (!ignore) {
          setStatus({
            state: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    loadStatus()

    return () => {
      ignore = true
    }
  }, [])

  const statusLabel = useMemo(() => {
    if (status.state === 'ready') {
      return 'API online'
    }

    if (status.state === 'error') {
      return 'Backend unavailable'
    }

    return 'Checking API'
  }, [status.state])

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Express + React starter</p>
        <h1>React app ready for OpenClaw Team</h1>
        <p className="lead">
          Frontend is served by Vite in `fe/` and talks to the Express API in `be/`
          through the `/api` proxy.
        </p>

        <div className="hero-actions">
          <span className={`status-pill status-pill--${status.state}`}>{statusLabel}</span>
          <code>GET /api/health</code>
        </div>
      </section>

      <section className="grid">
        <article className="card card--primary">
          <p className="card-label">Backend status</p>
          <h2>{status.state === 'ready' ? 'Connected successfully' : 'Waiting for backend'}</h2>
          <p>
            {status.state === 'ready'
              ? 'The React frontend can reach the Express server.'
              : 'Start the backend server to let the frontend fetch live API data.'}
          </p>

          <dl className="details">
            <div>
              <dt>Service</dt>
              <dd>{status.data?.service ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Healthy</dt>
              <dd>{status.data?.ok ? 'true' : 'false'}</dd>
            </div>
          </dl>

          {status.error ? <p className="error-text">{status.error}</p> : null}
        </article>

        <article className="card">
          <p className="card-label">Run locally</p>
          <ul className="command-list">
            <li>
              <code>npm run dev:backend</code>
            </li>
            <li>
              <code>npm run dev:frontend</code>
            </li>
            <li>
              <code>npm run dev</code>
            </li>
          </ul>
        </article>

        <article className="card">
          <p className="card-label">Next build step</p>
          <p>
            Add feature routes in `be/src/app.js` and replace this landing screen with your
            actual product UI in `fe/src/App.jsx`.
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
