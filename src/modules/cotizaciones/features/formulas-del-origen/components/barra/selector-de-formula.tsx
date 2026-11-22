'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FormulaDeLaLista } from '../../../../entities/formulas-del-origen/lista'
import { ListaDelSelectorDiferida } from './diferidos'
import type { ListaDelSelector } from './lista-del-selector'

type Props = Omit<ComponentProps<typeof ListaDelSelector>, 'alCerrar' | 'elegidaId'> & {
  elegida: FormulaDeLaLista | null
}

// «Fórmula: <nombre> (activa) ▾» (sin fórmulas, «Sin fórmulas ▾»): abre la lista del selector, cuyo código se pide al abrirlo.
export function SelectorDeFormula({ elegida, ...lista }: Props) {
  const [abierto, setAbierto] = useState(false)
  const montada = useAbiertoAlgunaVez(abierto)
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="min-h-11 max-w-full min-w-0 justify-start md:min-h-9"
          />
        }
      >
        <span className="min-w-0 truncate">
          {elegida
            ? `Fórmula: ${elegida.nombre}${elegida.activa ? ' (activa)' : ''}`
            : 'Sin fórmulas'}
        </span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-2">
        {montada ? (
          <ListaDelSelectorDiferida
            {...lista}
            elegidaId={elegida?.id ?? null}
            alCerrar={() => {
              setAbierto(false)
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
