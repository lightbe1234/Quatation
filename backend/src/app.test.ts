import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './app.js'

describe('Express application', () => {
  it('reports a healthy API', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('returns the standard error shape for unknown routes', async () => {
    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Route not found' })
  })

})
