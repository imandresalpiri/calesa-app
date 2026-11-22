'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TITULO_DE_AVISOS_DE_LA_PAGINA, avisosDeLaPagina } from '../../../entities/avisos-de-roles'
import { BotonDeAvisos } from './boton-de-avisos'

type Props = { puedeGestionar: boolean; alCrearRol: () => void; alAvisos: () => void }

export function CabeceraMatriz({ puedeGestionar, alCrearRol, alAvisos }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          Roles y permisos
        </h1>
        <BotonDeAvisos
          titulo={TITULO_DE_AVISOS_DE_LA_PAGINA}
          cantidad={avisosDeLaPagina(puedeGestionar).length}
          alAbrir={alAvisos}
          className="shrink-0"
        />
      </div>
      {puedeGestionar ? (
        <Button className="h-11 md:h-9" onClick={alCrearRol}>
          <PlusIcon aria-hidden />
          Nuevo rol
        </Button>
      ) : null}
    </div>
  )
}
