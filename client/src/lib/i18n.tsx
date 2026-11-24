import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const it = {
  'hero.title': 'I tuoi PDF, in ordine.',
  'hero.subtitle':
    'Unisci, dividi e riorganizza le pagine in pochi secondi. Nessun account, niente da installare.',
  'drop.title': 'Trascina qui i tuoi PDF',
  'drop.or': 'oppure',
  'drop.browse': 'Scegli i file',
  'drop.hint': 'Solo PDF · fino a {max} MB per file',
  'drop.overlay': 'Rilascia per aggiungere i PDF',
  'drop.reading': 'Lettura dei file…',
  'feature.merge.title': 'Unisci',
  'feature.merge.desc': "Combina più PDF in un unico file, nell'ordine che vuoi.",
  'feature.split.title': 'Dividi',
  'feature.split.desc': 'Separa ogni pagina o estrai solo gli intervalli che ti servono.',
  'feature.organize.title': 'Organizza',
  'feature.organize.desc': 'Riordina, ruota ed elimina le pagine, anche mescolando più file.',
  privacy: 'I file vengono elaborati in memoria e non sono mai salvati sul server.',

  'header.saved': 'Salvato su questo dispositivo',
  'header.saved.tip':
    'File e modifiche restano nel tuo browser: se la pagina si chiude o va in crash, riparti da dove eri.',
  'header.clear': 'Svuota',
  'header.theme': 'Cambia tema',
  'header.lang': 'Switch to English',

  'clear.title': 'Svuotare tutto?',
  'clear.desc': 'I file caricati e le modifiche verranno rimossi da questo dispositivo.',
  'clear.confirm': 'Svuota tutto',
  cancel: 'Annulla',

  'tab.merge': 'Unisci',
  'tab.split': 'Dividi',
  'tab.organize': 'Organizza',
  add: 'Aggiungi PDF',

  'files_one': '{count} file',
  'files_other': '{count} file',
  'pages_one': '{count} pagina',
  'pages_other': '{count} pagine',
  'selected_one': '{count} selezionata',
  'selected_other': '{count} selezionate',
  'restored_one': 'Sessione ripristinata: {count} file',
  'restored_other': 'Sessione ripristinata: {count} file',
  'added_one': '{count} file aggiunto',
  'added_other': '{count} file aggiunti',
  'willCreate_one': 'Verrà creato {count} PDF',
  'willCreate_other': 'Verranno creati {count} PDF in un archivio ZIP',

  'merge.title': 'Unisci i file',
  'merge.desc': "Trascina i file per scegliere l'ordine: verranno uniti dall'alto verso il basso.",
  'merge.action': 'Unisci e scarica',
  'merge.needTwo': 'Aggiungi almeno un altro PDF per unire.',
  'merge.defaultName': 'unito',
  'file.remove': 'Rimuovi file',
  'file.drag': 'Trascina per riordinare',

  'split.title': 'Dividi un file',
  'split.desc': 'Scegli come dividere: vedrai subito in anteprima i PDF che verranno creati.',
  'split.file': 'File da dividere',
  'split.mode.each': 'Ogni pagina',
  'split.mode.chunks': 'Ogni N pagine',
  'split.mode.ranges': 'Intervalli',
  'split.chunk': 'Pagine per file',
  'split.ranges': 'Intervalli di pagine',
  'split.ranges.placeholder': 'es. 1-3, 5, 8-',
  'split.ranges.help': 'Separa con una virgola. "8-" significa da pagina 8 alla fine.',
  'split.combine': 'Unisci gli intervalli in un solo PDF',
  'split.action': 'Dividi e scarica',
  'split.err.empty': 'Inserisci almeno un intervallo.',
  'split.err.syntax': '"{token}" non è un intervallo valido.',
  'split.err.range': '"{token}" è fuori dal documento ({pages} pagine).',
  'split.single': 'Il file ha una sola pagina: non c\'è nulla da dividere.',

  'organize.title': 'Organizza le pagine',
  'organize.desc': 'Trascina per riordinare, clicca per selezionare. Le pagine di tutti i file finiscono in un unico PDF.',
  'organize.selectAll': 'Seleziona tutto',
  'organize.deselect': 'Deseleziona',
  'organize.rotateLeft': 'Ruota a sinistra',
  'organize.rotateRight': 'Ruota a destra',
  'organize.delete': 'Elimina',
  'organize.reset': 'Ripristina',
  'organize.reset.tip': 'Rimetti tutte le pagine nell\'ordine originale',
  'organize.empty': 'Hai eliminato tutte le pagine.',
  'organize.action': 'Esporta PDF',
  'organize.defaultName': 'documento',
  'page.label': 'Pagina {n}',
  'page.from': '{file} · pag. {n}',

  'export.name': 'Nome del file',
  'export.working': 'Elaborazione…',
  'export.done': 'Fatto! Download avviato.',

  'err.not_pdf': '{file}: non è un PDF.',
  'err.too_large': '{file}: supera il limite di {max} MB.',
  'err.encrypted': '{file}: è protetto da password e non può essere modificato.',
  'err.invalid': '{file}: file danneggiato o non leggibile.',
  'err.invalid_pdf': '{file}: file danneggiato o non leggibile.',
  'err.duplicate': '{file}: già presente.',
  'err.storage':
    'Spazio del browser insufficiente: questi file non verranno ripristinati dopo un riavvio.',
  'err.network': 'Impossibile contattare il server. Riprova.',
  'err.server': 'Qualcosa è andato storto durante l\'elaborazione. Riprova.',
  'err.upload_too_large': 'Un file supera il limite di {max} MB accettato dal server.',

  'crash.title': 'Qualcosa è andato storto',
  'crash.desc': 'I tuoi file sono al sicuro su questo dispositivo: ricarica la pagina per riprendere.',
  'crash.reload': 'Ricarica',
  'crash.reset': 'Svuota e ricomincia',
} as const

type Key = keyof typeof it

const en: Record<Key, string> = {
  'hero.title': 'Your PDFs, sorted.',
  'hero.subtitle': 'Merge, split and rearrange pages in seconds. No account, nothing to install.',
  'drop.title': 'Drop your PDFs here',
  'drop.or': 'or',
  'drop.browse': 'Choose files',
  'drop.hint': 'PDF only · up to {max} MB per file',
  'drop.overlay': 'Drop to add your PDFs',
  'drop.reading': 'Reading files…',
  'feature.merge.title': 'Merge',
  'feature.merge.desc': 'Combine several PDFs into one file, in the order you want.',
  'feature.split.title': 'Split',
  'feature.split.desc': 'Separate every page or extract just the ranges you need.',
  'feature.organize.title': 'Organize',
  'feature.organize.desc': 'Reorder, rotate and delete pages, even mixing several files.',
  privacy: 'Files are processed in memory and never stored on the server.',

  'header.saved': 'Saved on this device',
  'header.saved.tip':
    'Files and edits stay in your browser: if the page closes or crashes, you pick up where you left off.',
  'header.clear': 'Clear',
  'header.theme': 'Toggle theme',
  'header.lang': "Passa all'italiano",

  'clear.title': 'Clear everything?',
  'clear.desc': 'Uploaded files and your edits will be removed from this device.',
  'clear.confirm': 'Clear everything',
  cancel: 'Cancel',

  'tab.merge': 'Merge',
  'tab.split': 'Split',
  'tab.organize': 'Organize',
  add: 'Add PDFs',

  'files_one': '{count} file',
  'files_other': '{count} files',
  'pages_one': '{count} page',
  'pages_other': '{count} pages',
  'selected_one': '{count} selected',
  'selected_other': '{count} selected',
  'restored_one': 'Session restored: {count} file',
  'restored_other': 'Session restored: {count} files',
  'added_one': '{count} file added',
  'added_other': '{count} files added',
  'willCreate_one': '{count} PDF will be created',
  'willCreate_other': '{count} PDFs will be created in a ZIP archive',

  'merge.title': 'Merge files',
  'merge.desc': 'Drag files to set the order: they are merged from top to bottom.',
  'merge.action': 'Merge & download',
  'merge.needTwo': 'Add at least one more PDF to merge.',
  'merge.defaultName': 'merged',
  'file.remove': 'Remove file',
  'file.drag': 'Drag to reorder',

  'split.title': 'Split a file',
  'split.desc': 'Choose how to split: the PDFs that will be created are previewed right away.',
  'split.file': 'File to split',
  'split.mode.each': 'Every page',
  'split.mode.chunks': 'Every N pages',
  'split.mode.ranges': 'Ranges',
  'split.chunk': 'Pages per file',
  'split.ranges': 'Page ranges',
  'split.ranges.placeholder': 'e.g. 1-3, 5, 8-',
  'split.ranges.help': 'Separate with commas. "8-" means from page 8 to the end.',
  'split.combine': 'Combine the ranges into a single PDF',
  'split.action': 'Split & download',
  'split.err.empty': 'Enter at least one range.',
  'split.err.syntax': '"{token}" is not a valid range.',
  'split.err.range': '"{token}" is outside the document ({pages} pages).',
  'split.single': 'This file has a single page: there is nothing to split.',

  'organize.title': 'Organize pages',
  'organize.desc': 'Drag to reorder, click to select. Pages from every file end up in a single PDF.',
  'organize.selectAll': 'Select all',
  'organize.deselect': 'Deselect',
  'organize.rotateLeft': 'Rotate left',
  'organize.rotateRight': 'Rotate right',
  'organize.delete': 'Delete',
  'organize.reset': 'Reset',
  'organize.reset.tip': 'Put every page back in its original order',
  'organize.empty': 'You deleted every page.',
  'organize.action': 'Export PDF',
  'organize.defaultName': 'document',
  'page.label': 'Page {n}',
  'page.from': '{file} · p. {n}',

  'export.name': 'File name',
  'export.working': 'Processing…',
  'export.done': 'Done! Download started.',

  'err.not_pdf': '{file}: not a PDF.',
  'err.too_large': '{file}: exceeds the {max} MB limit.',
  'err.encrypted': '{file}: is password protected and cannot be edited.',
  'err.invalid': '{file}: damaged or unreadable file.',
  'err.invalid_pdf': '{file}: damaged or unreadable file.',
  'err.duplicate': '{file}: already added.',
  'err.storage': 'Not enough browser storage: these files will not be restored after a restart.',
  'err.network': 'Could not reach the server. Please try again.',
  'err.server': 'Something went wrong while processing. Please try again.',
  'err.upload_too_large': 'A file exceeds the {max} MB limit accepted by the server.',

  'crash.title': 'Something went wrong',
  'crash.desc': 'Your files are safe on this device: reload the page to pick up where you left off.',
  'crash.reload': 'Reload',
  'crash.reset': 'Clear and start over',
}

export type Lang = 'it' | 'en'
const dictionaries: Record<Lang, Record<Key, string>> = { it, en }

export type TKey = Key
type PluralOf<K> = K extends `${infer Base}_one` ? Base : never
type PluralKey = PluralOf<Key>
type Vars = Record<string, string | number>

const LANG_KEY = 'pdf-studio:lang'

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'it' || saved === 'en') return saved
  } catch {
    // localStorage unavailable: fall back to the browser language
  }
  return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en'
}

function fill(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: Key, vars?: Vars) => string
  /** Pluralised message: picks the `_one` / `_other` variant from `count`. */
  tn: (key: PluralKey, count: number, vars?: Vars) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // preference simply won't persist
    }
  }, [])

  const value = useMemo<I18n>(() => {
    const dict = dictionaries[lang]
    return {
      lang,
      setLang,
      t: (key, vars) => fill(dict[key], vars),
      tn: (key, count, vars) =>
        fill(dict[`${key}_${count === 1 ? 'one' : 'other'}`], { count, ...vars }),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
