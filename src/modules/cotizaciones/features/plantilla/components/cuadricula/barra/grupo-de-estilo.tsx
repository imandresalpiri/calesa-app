'use client'

import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, BoldIcon, ItalicIcon } from 'lucide-react'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/shared/ui/dropdown-menu'
import type { EstiloDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import type { CambioDeEstilo } from '../../../../../entities/plantilla/edicion/estilo'
import { BotonDeLaBarra, GrupoDeLaBarra, MenuDeLaBarra } from './elementos'

type Props = {
  // Lo que comparten las celdas elegidas (`estiloComun()`); nulo, nada elegido.
  comun: EstiloDeLaCelda | null
  ocupado: boolean
  alCambiar: (cambio: CambioDeEstilo) => void
}

const ALINEAR = [
  { valor: 'izquierda', texto: 'A la izquierda', Icono: AlignLeftIcon },
  { valor: 'centro', texto: 'Al centro', Icono: AlignCenterIcon },
  { valor: 'derecha', texto: 'A la derecha', Icono: AlignRightIcon },
] as const

const SIN_ELEGIR = 'Elige una celda, una fila o una columna.'

// «Estilo»: lo más usado del formato de la celda a un toque (negrita, cursiva y la alineación); el color, el tamaño y los bordes están en el panel «Celda».
export function GrupoDeEstilo({ comun, ocupado, alCambiar }: Props) {
  const motivo = comun === null ? SIN_ELEGIR : null
  const alinear = comun?.alinear ?? 'izquierda'
  const Actual = ALINEAR.find((a) => a.valor === alinear)?.Icono ?? AlignLeftIcon
  return (
    <GrupoDeLaBarra nombre="Estilo">
      <BotonDeLaBarra
        etiqueta="Negrita"
        titulo="Negrita"
        motivo={motivo}
        ocupado={ocupado}
        encendido={comun?.negrita === true}
        alTocar={() => {
          alCambiar({ negrita: comun?.negrita !== true })
        }}
      >
        <BoldIcon aria-hidden className="size-4" />
      </BotonDeLaBarra>
      <BotonDeLaBarra
        etiqueta="Cursiva"
        titulo="Cursiva"
        motivo={motivo}
        ocupado={ocupado}
        encendido={comun?.cursiva === true}
        alTocar={() => {
          alCambiar({ cursiva: comun?.cursiva !== true })
        }}
      >
        <ItalicIcon aria-hidden className="size-4" />
      </BotonDeLaBarra>
      <MenuDeLaBarra
        titulo="Alineación"
        icono={<Actual aria-hidden className="size-4" />}
        ocupado={ocupado || comun === null}
        motivo={motivo}
      >
        <DropdownMenuRadioGroup
          value={comun?.alinear ?? ''}
          onValueChange={(valor) => {
            const elegida = ALINEAR.find((a) => a.valor === valor)
            if (elegida !== undefined) alCambiar({ alinear: elegida.valor })
          }}
        >
          {ALINEAR.map(({ valor, texto, Icono }) => (
            <DropdownMenuRadioItem key={valor} value={valor} className="min-h-11 md:min-h-8">
              <Icono aria-hidden className="size-4" />
              {texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </MenuDeLaBarra>
    </GrupoDeLaBarra>
  )
}
