import assert from 'node:assert/strict'
import { test } from 'node:test'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { PdfError, buildOutputs, safeName, zipOutputs } from '../src/pdf.js'

/** Each page gets a distinctive width so its origin can be checked after processing. */
async function makePdf(name, widths) {
  const doc = await PDFDocument.create()
  for (const w of widths) doc.addPage([w, 500])
  return { originalname: name, buffer: Buffer.from(await doc.save()) }
}

const widthsOf = async (bytes) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth())

test('merges whole files in the requested order', async () => {
  const files = [await makePdf('a.pdf', [101, 102]), await makePdf('b.pdf', [201])]
  const [out] = await buildOutputs(files, {
    outputs: [
      {
        name: 'merged',
        pages: [
          { file: 1, page: 0 },
          { file: 0, page: 0 },
          { file: 0, page: 1 },
        ],
      },
    ],
  })
  assert.equal(out.name, 'merged.pdf')
  assert.deepEqual(await widthsOf(out.bytes), [201, 101, 102])
})

test('splits into several outputs and zips them', async () => {
  const files = [await makePdf('a.pdf', [101, 102, 103])]
  const outputs = await buildOutputs(files, {
    outputs: [
      { name: 'part', pages: [{ file: 0, page: 0 }] },
      { name: 'part', pages: [{ file: 0, page: 1 }, { file: 0, page: 2 }] },
    ],
  })
  // Duplicate names are disambiguated.
  assert.deepEqual(outputs.map((o) => o.name), ['part.pdf', 'part (2).pdf'])
  assert.deepEqual(await widthsOf(outputs[1].bytes), [102, 103])

  const zip = await JSZip.loadAsync(await zipOutputs(outputs))
  assert.deepEqual(Object.keys(zip.files).sort(), ['part (2).pdf', 'part.pdf'])
})

test('applies rotation on top of the existing one and allows duplicates', async () => {
  const files = [await makePdf('a.pdf', [101])]
  const [out] = await buildOutputs(files, {
    outputs: [
      {
        name: 'r',
        pages: [
          { file: 0, page: 0, rotate: 90 },
          { file: 0, page: 0, rotate: 270 },
          { file: 0, page: 0 },
        ],
      },
    ],
  })
  const angles = (await PDFDocument.load(out.bytes)).getPages().map((p) => p.getRotation().angle)
  assert.deepEqual(angles, [90, 270, 0])
})

test('rejects bad plans and unreadable files', async () => {
  const files = [await makePdf('a.pdf', [101])]
  const code = (plan, f = files) =>
    buildOutputs(f, plan).then(
      () => 'ok',
      (e) => (e instanceof PdfError ? e.code : `unexpected: ${e}`),
    )

  assert.equal(await code({ outputs: [] }), 'invalid_plan')
  assert.equal(await code({ outputs: [{ name: 'x', pages: [{ file: 3, page: 0 }] }] }), 'invalid_plan')
  assert.equal(
    await code({ outputs: [{ name: 'x', pages: [{ file: 0, page: 0, rotate: 45 }] }] }),
    'invalid_plan',
  )
  assert.equal(
    await code({ outputs: [{ name: 'x', pages: [{ file: 0, page: 9 }] }] }),
    'page_out_of_range',
  )
  assert.equal(
    await code({ outputs: [{ name: 'x', pages: [{ file: 0, page: 0 }] }] }, [
      { originalname: 'bad.pdf', buffer: Buffer.from('not a pdf') },
    ]),
    'invalid_pdf',
  )
})

test('safeName strips unsafe characters', () => {
  assert.equal(safeName('../../etc/pass:wd.pdf'), 'etc pass wd')
  assert.equal(safeName('   '), 'document')
  assert.equal(safeName('Fattura n°1.PDF'), 'Fattura n°1')
})
