import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './app.js'
import { errorHandler } from './middleware/errorHandler.js'

describe('Express application', () => {
  it('reports a healthy API', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('rejects direct access to protected API routes without a session', async () => {
    const response = await request(app).get('/api/stores')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Authentication required' })
  })

  it('returns the standard error shape for unknown routes', async () => {
    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Route not found' })
  })

  it('returns a clear retryable error when an external service is unreachable', async () => {
    const failureApp = express()
    failureApp.get('/failure', async () => {
      throw new TypeError('fetch failed')
    })
    failureApp.use(errorHandler)

    const response = await request(failureApp).get('/failure')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      error:
        'A required external service could not be reached. Please try again.',
    })
  })
})
