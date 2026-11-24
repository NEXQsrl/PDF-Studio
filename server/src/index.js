import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import { PdfError, buildOutputs, zipOutputs } from './pdf.js'

const PORT = Number(process.env.PORT) || 3001
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 100
const MAX_FILES = Number(process.env.MAX_FILES) || 50

const app = express()
app.disable('x-powered-by')

// Files live in memory only for the duration of the request: nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES, fieldSize: 5 * 1024 * 1024 },
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, maxFileMb: MAX_FILE_MB, maxFiles: MAX_FILES })
})

/**
 * Single endpoint behind merge, split and page organisation.
 * multipart: `files` (one or more PDFs) + `plan` (JSON, see pdf.js).
 * Responds with a PDF when the plan has one output, a zip otherwise.
 */
app.post('/api/process', upload.array('files', MAX_FILES), async (req, res) => {
  const files = req.files ?? []
  if (files.length === 0) throw new PdfError('no_files')

  let plan
  try {
    plan = JSON.parse(req.body.plan)
  } catch {
    throw new PdfError('invalid_plan')
  }

  const outputs = await buildOutputs(files, plan)

  res.setHeader('Cache-Control', 'no-store')
  if (outputs.length === 1) {
    res.type('application/pdf').send(Buffer.from(outputs[0].bytes))
  } else {
    res.type('application/zip').send(await zipOutputs(outputs))
  }
})

// In production the server also serves the built client.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use((_req, res) => res.status(404).json({ code: 'not_found' }))

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof PdfError) {
    return res.status(err.status).json({ code: err.code, ...err.extra })
  }
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE'
    return res
      .status(tooLarge ? 413 : 400)
      .json({ code: tooLarge ? 'too_large' : 'upload_failed', maxFileMb: MAX_FILE_MB })
  }
  console.error(err)
  res.status(500).json({ code: 'server_error' })
})

app.listen(PORT, () => {
  console.log(`PDF Studio server → http://localhost:${PORT}`)
})
