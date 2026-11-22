'use client'

import { cn } from 'cn'
import { HistoryIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLaFormula, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_LAS_VERSIONES } from './panel'

type Props = { origenId: string; formulaId: string; parte: ParteDeLaFormula }

// «Versiones» en la barra de la fórmula. En Planilla abre su drawer (`?panel=versiones`); en Hoja y Tarjeta lleva a la Planilla de la misma fórmula con el drawer
// abierto (las versiones son de la planilla), y con cambios sin guardar antes pregunta.
export function BotonDeLasVersiones({ origenId, formulaId, parte }: Props) {
  const router = useRouter()
  const panel = usePanelPorUrl(PANEL_DE_LAS_VERSIONES)
  const contenido = (
    <>
      <HistoryIcon aria-hidden className="size-4" />
      Versiones
    </>
  )
  if (parte === 'planilla') {
    return (
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          panel.abrir()
        }}
      >
        {contenido}
      </Button>
    )
  }
  const href = rutaDeLaFormula(origenId, formulaId, 'planilla', {
    [CLAVE_DE_PANEL]: PANEL_DE_LAS_VERSIONES,
  })
  return (
    <Link
      href={href}
      onClick={(evento) => {
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return
        evento.preventDefault()
        salirSinPerder(() => {
          router.push(href)
        })
      }}
      // Sin `cn()` el `border-transparent` de la base le gana al borde de «outline».
      className={cn(buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' }))}
    >
      {contenido}
    </Link>
  )
}
