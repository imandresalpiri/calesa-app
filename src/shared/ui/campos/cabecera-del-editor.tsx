'use client'

import { PlusIcon, SearchIcon } from 'lucide-react'
import { useId, type ReactNode, type Ref } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  consulta: string
  puedeGestionar: boolean
  busqueda: Ref<HTMLInputElement>
  alBuscar: (consulta: string) => void
  alCrear: () => void
  // Junto a «Nuevo campo»: el botón «Grupos» y su drawer.
  extra?: ReactNode
}

// Arriba del editor: buscar un campo por su nombre (en el navegador, sin tildes; `?q=`), «Grupos» (si lo hay) y «Nuevo campo», la acción
// principal.
export function CabeceraDelEditor({
  consulta,
  puedeGestionar,
  busqueda,
  alBuscar,
  alCrear,
  extra = null,
}: Props) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56">
        <label htmlFor={id} className="sr-only">
          Buscar campo
        </label>
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--color-ink-faint)"
        />
        <Input
          ref={busqueda}
          id={id}
          type="search"
          placeholder="Buscar campo"
          autoComplete="off"
          className="h-[44px] w-full pl-8 md:h-9"
          value={consulta}
          onChange={(evento) => {
            alBuscar(evento.target.value)
          }}
        />
      </div>
      {extra}
      <Button className="h-[44px] md:h-9" disabled={!puedeGestionar} onClick={alCrear}>
        <PlusIcon aria-hidden />
        Nuevo campo
      </Button>
    </div>
  )
}
