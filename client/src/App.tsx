import { useEffect } from 'react'
import { Combine, LayoutGrid, Scissors, ShieldCheck, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { AddFilesButton, Dropzone, GlobalDrop } from '@/components/dropzone'
import { MergePanel } from '@/components/merge-panel'
import { OrganizePanel } from '@/components/organize-panel'
import { SplitPanel } from '@/components/split-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/lib/i18n'
import { useStore, type Tool } from '@/store'

const TOOLS: { id: Tool; icon: LucideIcon }[] = [
  { id: 'merge', icon: Combine },
  { id: 'split', icon: Scissors },
  { id: 'organize', icon: LayoutGrid },
]

function Landing() {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-6 sm:pt-14">
      <div className="space-y-4 text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tighter text-balance sm:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          {t('hero.subtitle')}
        </p>
      </div>

      <Dropzone />

      <ul className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map(({ id, icon: Icon }) => (
          <li key={id} className="rounded-2xl border bg-card/60 p-4 backdrop-blur-sm">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <p className="text-sm font-medium">{t(`feature.${id}.title`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`feature.${id}.desc`)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Workspace() {
  const { t } = useI18n()
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)

  return (
    <Tabs value={tool} onValueChange={(value) => setTool(value as Tool)} className="gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="h-10! p-1">
          {TOOLS.map(({ id, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2 px-3.5 sm:px-5">
              <Icon />
              {t(`tab.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <AddFilesButton />
      </div>

      <TabsContent value="merge">
        <MergePanel />
      </TabsContent>
      <TabsContent value="split">
        <SplitPanel />
      </TabsContent>
      <TabsContent value="organize">
        <OrganizePanel />
      </TabsContent>
    </Tabs>
  )
}

export default function App() {
  const { t, tn } = useI18n()
  const ready = useStore((s) => s.ready)
  const hasFiles = useStore((s) => s.files.length > 0)
  const hydrate = useStore((s) => s.hydrate)

  // Bring back whatever was open before a reload, a closed tab or a crash.
  useEffect(() => {
    let active = true
    void hydrate().then((restored) => {
      if (active && restored > 0) toast.success(tn('restored', restored), { id: 'restored' })
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrate])

  return (
    <GlobalDrop>
      <div className="relative flex min-h-svh flex-col">
        <div aria-hidden className="backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]" />
        <AppHeader />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          {ready && (hasFiles ? <Workspace /> : <Landing />)}
        </main>

        <footer className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 pb-8 text-center text-xs text-muted-foreground sm:px-6">
          <ShieldCheck className="size-3.5 shrink-0" />
          {t('privacy')}
        </footer>
      </div>
    </GlobalDrop>
  )
}
