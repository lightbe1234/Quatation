import { Router, type RequestHandler } from 'express'
import { env } from '../config/env.js'
import { AppError } from '../errors/appError.js'
import type { OneDriveService } from '../graph/oneDriveService.js'
import { buildSummaryWorkbook } from '../graph/summaryWorkbook.js'

export function createOneDriveRouter(
  service: OneDriveService,
  authenticate: RequestHandler,
) {
  const router = Router()

  router.get('/connect-onedrive', async (_request, response) => {
    response.redirect(await service.createAuthorizationUrl())
  })

  router.get('/api/auth/callback', async (request, response) => {
    const oauthError =
      typeof request.query.error === 'string' ? request.query.error : undefined

    if (oauthError) {
      response.redirect(
        `${env.frontendUrl}/onedrive?error=${encodeURIComponent(oauthError)}`,
      )
      return
    }

    const code =
      typeof request.query.code === 'string' ? request.query.code : undefined
    const state =
      typeof request.query.state === 'string' ? request.query.state : undefined

    if (!code || !state) {
      throw new AppError(
        'Microsoft callback is missing its code or state',
        400,
      )
    }

    await service.completeAuthorization(code, state)
    response.redirect(`${env.frontendUrl}/onedrive?connected=1`)
  })

  router.get(
    '/api/onedrive/status',
    authenticate,
    async (_request, response) => {
      response.json(await service.getStatus())
    },
  )

  router.post(
    '/api/onedrive/refresh-pdf-template',
    authenticate,
    async (request, response) => {
      if (request.body?.confirmed !== true) {
        throw new AppError(
          'PDF workbook refresh confirmation is required',
          400,
        )
      }

      response.json({
        result: await service.refreshPdfTemplate(),
      })
    },
  )

  router.get(
    '/api/onedrive/summary-grid',
    authenticate,
    async (_request, response) => {
      response.json({ grid: await service.getSummaryGrid() })
    },
  )

  router.get(
    '/api/onedrive/summary-workbook',
    authenticate,
    async (_request, response) => {
      const workbook = await buildSummaryWorkbook(
        await service.getSummaryGrid(),
      )

      response
        .status(200)
        .set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="quotation-summary.xlsx"',
          'Content-Length': String(workbook.length),
        })
        .send(workbook)
    },
  )

  router.post(
    '/api/onedrive/inspect-test-cell',
    authenticate,
    async (_request, response) => {
      response.json({ candidate: await service.inspectSafeTestCell() })
    },
  )

  router.post(
    '/api/onedrive/test-cell',
    authenticate,
    async (request, response) => {
      if (request.body?.confirmed !== true) {
        throw new AppError('Test-cell write confirmation is required', 400)
      }

      if (
        typeof request.body.worksheet !== 'string' ||
        typeof request.body.address !== 'string'
      ) {
        throw new AppError(
          'Worksheet and test-cell address are required',
          400,
        )
      }

      response.json({
        result: await service.runTestCell(
          request.body.worksheet,
          request.body.address,
        ),
      })
    },
  )

  return router
}
