import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const inputPath = resolve('../tmp/pdfs/current-workbook.pdf')
const outputDirectory = resolve('../tmp/pdfs/rendered')
const pdfData = new Uint8Array(await readFile(inputPath))
const document = await getDocument({ data: pdfData }).promise

await mkdir(outputDirectory, { recursive: true })

const columns = 3
const thumbnailWidth = 360
const thumbnailHeight = 500
const rows = Math.ceil(document.numPages / columns)
const contactSheet = createCanvas(
  columns * thumbnailWidth,
  rows * thumbnailHeight,
)
const contactContext = contactSheet.getContext('2d')
contactContext.fillStyle = '#e2e8f0'
contactContext.fillRect(0, 0, contactSheet.width, contactSheet.height)

const pages: Array<{ page: number; width: number; height: number; text: string }> =
  []

for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 0.8 })
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  )
  const context = canvas.getContext('2d')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvas: canvas as never,
    canvasContext: context as never,
    viewport,
  }).promise

  await writeFile(
    resolve(outputDirectory, `page-${pageNumber}.png`),
    canvas.toBuffer('image/png'),
  )

  const textContent = await page.getTextContent()
  const text = textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  pages.push({
    page: pageNumber,
    width: canvas.width,
    height: canvas.height,
    text: text.slice(0, 180),
  })

  const column = (pageNumber - 1) % columns
  const row = Math.floor((pageNumber - 1) / columns)
  const availableWidth = thumbnailWidth - 24
  const availableHeight = thumbnailHeight - 48
  const scale = Math.min(
    availableWidth / canvas.width,
    availableHeight / canvas.height,
  )
  const drawWidth = canvas.width * scale
  const drawHeight = canvas.height * scale
  const x = column * thumbnailWidth + (thumbnailWidth - drawWidth) / 2
  const y = row * thumbnailHeight + 32

  contactContext.fillStyle = '#0f172a'
  contactContext.font = 'bold 18px sans-serif'
  contactContext.fillText(
    `Page ${pageNumber}`,
    column * thumbnailWidth + 12,
    row * thumbnailHeight + 22,
  )
  contactContext.drawImage(canvas, x, y, drawWidth, drawHeight)
}

const contactSheetPath = resolve(outputDirectory, 'contact-sheet.png')
await writeFile(contactSheetPath, contactSheet.toBuffer('image/png'))

console.log(
  JSON.stringify(
    {
      pageCount: document.numPages,
      contactSheetPath,
      pages,
    },
    null,
    2,
  ),
)
