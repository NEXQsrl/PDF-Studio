import { CloudCheck, Layers, Moon, Sun, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { useStore } from '@/store'

export function AppHeader() {
  const { t, lang, setLang } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const hasFiles = useStore((s) => s.files.length > 0)
  const clear = useStore((s) => s.clear)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Layers className="size-4" />
          </div>
          <span className="font-heading text-[0.95rem] font-semibold tracking-tight">PDF Studio</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {hasFiles && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="mr-1 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CloudCheck className="size-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">{t('header.saved')}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-center">{t('header.saved.tip')}</TooltipContent>
              </Tooltip>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Trash2 />
                    <span className="hidden sm:inline">{t('header.clear')}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('clear.title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('clear.desc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => void clear()}>
                      {t('clear.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-9 font-semibold"
                aria-label={t('header.lang')}
                onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
              >
                {lang.toUpperCase()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('header.lang')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('header.theme')}
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="hidden dark:block" />
                <Moon className="dark:hidden" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('header.theme')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
