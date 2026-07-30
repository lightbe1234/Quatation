import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/appError.js'

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message })
    return
  }

  if (
    error instanceof TypeError &&
    /fetch|network|socket/i.test(error.message)
  ) {
    response.status(503).json({
      error:
        'A required external service could not be reached. Please try again.',
    })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
}
