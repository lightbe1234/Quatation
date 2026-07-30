export const quotationFieldDefinitions = [
  { key: 'qtn_no', label: 'QTN #', required: true },
  { key: 'job_no', label: 'Job #', required: false },
  { key: 'unit', label: 'Unit', required: false },
  { key: 'client_name', label: 'Client Name', required: true },
  { key: 'region', label: 'Region', required: true },
  { key: 'intro_line_1', label: 'Intro line 1', required: false },
  { key: 'intro_line_2', label: 'Intro line 2', required: false },
] as const

export type QuotationFieldKey =
  (typeof quotationFieldDefinitions)[number]['key']

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
