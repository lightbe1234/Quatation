declare module 'xlsx-populate' {
  type CellValue = string | number | boolean | null | undefined

  interface Cell {
    style(name: string): unknown
    style(name: string, value: unknown): this
    value(): CellValue
  }

  interface Range {
    style(styles: Record<string, unknown>): this
    value(): CellValue[][]
    value(values: CellValue[][]): this
  }

  interface Row {
    height(value: number): this
  }

  interface Column {
    width(value: number): this
  }

  interface Sheet {
    cell(address: string): Cell
    column(column: string): Column
    name(): string
    name(value: string): this
    range(address: string): Range
    row(row: number): Row
  }

  interface Workbook {
    outputAsync(): Promise<Buffer | Uint8Array | ArrayBuffer>
    sheet(index: number | string): Sheet
    sheets(): Sheet[]
  }

  interface XlsxPopulateStatic {
    fromBlankAsync(): Promise<Workbook>
    fromDataAsync(data: Buffer | Uint8Array | ArrayBuffer): Promise<Workbook>
  }

  const XlsxPopulate: XlsxPopulateStatic
  export default XlsxPopulate
}
