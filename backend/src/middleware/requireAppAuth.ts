import type { RequestHandler } from 'express'
import { AppError } from '../errors/appError.js'
import { getSupabaseClient } from '../lib/supabase.js'

export const requireAppAuth: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const authorization = request.header('Authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    next(new AppError('Authentication required', 401))
    return
  }

  const { data, error } = await getSupabaseClient().auth.getUser(token)

  if (error || !data.user) {
    next(new AppError('Your session is invalid or expired. Sign in again.', 401))
    return
  }

  next()
}
