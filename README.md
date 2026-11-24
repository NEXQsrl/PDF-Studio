# PDF Studio

Unisci, dividi e riorganizza PDF dal browser. Nessun account, interfaccia in italiano e inglese.
*Merge, split and rearrange PDFs in the browser. No account, Italian and English UI.*

## Funzionalità

- **Unisci** – carica più PDF, trascinali per scegliere l'ordine, scarica un unico file.
- **Dividi** – ogni pagina, ogni N pagine oppure intervalli (`1-3, 5, 8-`), con anteprima dei PDF che verranno creati. Più file in uscita vengono scaricati come ZIP.
- **Organizza** – griglia di tutte le pagine di tutti i file: riordina con il drag & drop, ruota, elimina ed esporta un nuovo PDF.
- **Ripristino dopo un crash** – file e modifiche sono salvati nel browser (IndexedDB): se la scheda si chiude o va in crash, alla riapertura la sessione viene ripristinata.
- Tema chiaro/scuro, trascinamento dei file ovunque nella pagina.

## Avvio

Richiede Node.js 20+.

```bash
npm install
npm run dev      # client su http://localhost:5173, API su http://localhost:3001
```

Produzione (Express serve anche il client compilato):

```bash
npm run build
npm start        # http://localhost:3001
```

Test del backend: `npm test`.

### Docker / Portainer

```bash
docker compose up -d --build   # http://localhost:5677
```

Su Portainer: **Stacks → Add stack → Repository**, URL del repository e compose path
`docker-compose.yml`. L'immagine viene compilata dal `Dockerfile` (il metodo "Web editor" non
funziona, perché richiede un'immagine già pubblicata).

Variabili d'ambiente del server: `PORT` (3001), `MAX_FILE_MB` (100), `MAX_FILES` (50).
Se cambi `MAX_FILE_MB`, allinea anche `MAX_FILE_MB` in `client/src/store.ts`.

## Struttura

```
client/   React + Vite + Tailwind + shadcn/ui
  src/store.ts          stato (zustand) + salvataggio della sessione
  src/lib/storage.ts    cache IndexedDB
  src/lib/pdf.ts        anteprime con pdf.js
  src/lib/i18n.tsx      testi IT / EN
server/   Express + pdf-lib
  src/index.js          POST /api/process
  src/pdf.js            costruzione dei PDF
```

Il server espone un solo endpoint, `POST /api/process`: riceve i PDF e un "piano"
(`{ outputs: [{ name, pages: [{ file, page, rotate }] }] }`) e risponde con un PDF, o con uno
ZIP se gli output sono più di uno. I file restano in memoria per la durata della richiesta e
non vengono mai scritti su disco.

## Limiti noti

- I PDF protetti da password non sono supportati (vengono rifiutati al caricamento).
- Unendo o dividendo, segnalibri e moduli interattivi del documento originale possono andare persi.
