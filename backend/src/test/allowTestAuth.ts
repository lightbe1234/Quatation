import type { RequestHandler } from 'express'

export const allowTestAuth: RequestHandler = (
  _request,
  _response,
  next,
) => next()
