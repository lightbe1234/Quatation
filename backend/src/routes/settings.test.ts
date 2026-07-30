import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import type { QuotationFieldOptionRepository } from '../repositories/quotationFieldOptionRepository.js'
import type {
  QuotationFieldOption,
  QuotationFieldOptionInput,
} from '../types/quotationFieldOption.js'
import { allowTestAuth } from '../test/allowTestAuth.js'

class MemoryOptionRepository implements QuotationFieldOptionRepository {
  options: QuotationFieldOption[] = []

  async list() {
    return this.options
  }

  async create(input: QuotationFieldOptionInput) {
    const timestamp = new Date().toISOString()
    const option = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.options.push(option)
    return option
  }

  async update(id: string, input: QuotationFieldOptionInput) {
    const index = this.options.findIndex((option) => option.id === id)
    const option = {
      ...this.options[index],
      ...input,
      updatedAt: new Date().toISOString(),
    }
    this.options[index] = option
    return option
  }

  async delete(id: string) {
    this.options = this.options.filter((option) => option.id !== id)
  }
}

describe('Settings routes', () => {
  let repository: MemoryOptionRepository

  beforeEach(() => {
    repository = new MemoryOptionRepository()
  })

  it('creates, lists, updates, and deletes a quotation option', async () => {
    const app = createApp(
      undefined,
      undefined,
      undefined,
      repository,
      allowTestAuth,
    )
    const created = await request(app).post('/api/settings/options').send({
      fieldKey: 'client_name',
      optionValue: "McDonald's",
      sortOrder: 1,
    })

    expect(created.status).toBe(201)
    expect(created.body.option.optionValue).toBe("McDonald's")

    const id = created.body.option.id
    const listed = await request(app).get('/api/settings/options')
    expect(listed.body.options).toHaveLength(1)

    const updated = await request(app)
      .put(`/api/settings/options/${id}`)
      .send({
        fieldKey: 'client_name',
        optionValue: 'McDonalds KSA',
        sortOrder: 2,
      })
    expect(updated.body.option.optionValue).toBe('McDonalds KSA')
    expect(updated.body.option.sortOrder).toBe(2)

    const deleted = await request(app)
      .delete(`/api/settings/options/${id}`)
      .send({ confirmed: true })
    expect(deleted.status).toBe(204)
    expect(repository.options).toHaveLength(0)
  })

  it('rejects unsupported fields and unconfirmed deletes', async () => {
    const app = createApp(
      undefined,
      undefined,
      undefined,
      repository,
      allowTestAuth,
    )
    const invalid = await request(app).post('/api/settings/options').send({
      fieldKey: 'subject',
      optionValue: 'Not supported',
      sortOrder: 0,
    })
    expect(invalid.status).toBe(400)
    expect(invalid.body).toEqual({
      error: 'fieldKey is not a supported quotation field',
    })

    const unconfirmed = await request(app)
      .delete('/api/settings/options/example-id')
      .send({ confirmed: false })
    expect(unconfirmed.status).toBe(400)
    expect(unconfirmed.body).toEqual({
      error: 'Confirmation is required before deleting an option',
    })
  })
})
