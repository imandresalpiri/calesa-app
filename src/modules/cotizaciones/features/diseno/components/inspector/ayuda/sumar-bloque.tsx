'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { AyudaDeDiseno, TipoDeBloque } from '../../../../../entities/diseno'
import {
  motivoParaSumar,
  NOMBRES_DE_BLOQUE,
} from '../../../../../entities/diseno/edicion-de-la-ayuda'

const TIPOS: readonly TipoDeBloque[] = ['titulo', 'texto', 'enlaces', 'tabla']

type Props = {
  ayuda: AyudaDeDiseno | undefined
  // La tabla con que nace un bloque de tabla, o por qué no se puede (`tablaParaElBloqueNuevo()`).
  paraTabla: { tabla: string } | { motivo: string }
  ocupado: boolean
  alSumar: (tipo: TipoDeBloque, tabla?: string) => void
}

// «+ Bloque»: un menú con Título, Texto, Enlaces y Tabla; apagado, cada uno dice por qué (el tope de bloques, el de tablas o un origen sin tablas). El bloque
// nace vacío al final de la lista; uno de tabla, con su tabla.
export function SumarBloque({ ayuda, paraTabla, ocupado, alSumar }: Props) {
  const motivoDe = (tipo: TipoDeBloque) =>
    motivoParaSumar(ayuda, tipo) ??
    (tipo === 'tabla' && 'motivo' in paraTabla ? paraTabla.motivo : null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={ocupado}
        render={
          <Button type="button" variant="outline" className="h-11 w-fit md:h-8">
            <PlusIcon aria-hidden />
            Bloque
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="max-w-(--available-width) min-w-48">
        {TIPOS.map((tipo) => {
          const motivo = motivoDe(tipo)
          return (
            <DropdownMenuItem
              key={tipo}
              disabled={motivo !== null}
              className="grid min-h-11 gap-0 md:min-h-8"
              onClick={() => {
                alSumar(
                  tipo,
                  tipo === 'tabla' && 'tabla' in paraTabla ? paraTabla.tabla : undefined,
                )
              }}
            >
              <span>{NOMBRES_DE_BLOQUE[tipo]}</span>
              {motivo === null ? null : (
                <span className="text-(length:--text-xs) text-(--color-ink-soft)">{motivo}</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
