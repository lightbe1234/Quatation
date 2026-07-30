export const quotationFieldKeys = [
  'qtn_no',
  'job_no',
  'unit',
  'client_name',
  'region',
  'intro_line_1',
  'intro_line_2',
] as const

export type QuotationFieldKey = (typeof quotationFieldKeys)[number]

export type QuotationFieldOption = {
  id: string
  fieldKey: QuotationFieldKey
  optionValue: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type QuotationFieldOptionInput = Pick<
  QuotationFieldOption,
  'fieldKey' | 'optionValue' | 'sortOrder'
>

export type QuotationFieldOptionRow = {
  id: string
  field_key: QuotationFieldKey
  option_value: string
  sort_order: number
  created_at: string
  updated_at: string
}
