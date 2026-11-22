'use client'

import {
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { use, type ReactNode } from 'react'
import { idDeCasilla, idDeCasillaLibre, idDeFijo, idDeFila } from '@/shared/lib/campos'
import { CasillaLibre, CasillaLlena } from '../casilla'
import type { Envoltorios, PropsDeCasilla, PropsDeFijo, PropsDeFila, PropsDeLibre } from '../cuerpo'
import { FilaDeCampo } from '../fila-de-campo'
import { FilaFija } from '../fila-fija'
import { AsaDeArrastre } from './asa'
import { ArrastreActivo } from './contexto'
import { useArrastrable, useLibre, useOrdenable } from './use-ordenable'

export const CONTENEDOR_DE_CASILLAS = 'casillas'

function Lista({ id, ids, children }: { id: string; ids: readonly string[]; children: ReactNode }) {
  const activo = use(ArrastreActivo)
  return (
    <SortableContext
      id={id}
      items={[...ids]}
      strategy={id === CONTENEDOR_DE_CASILLAS ? rectSortingStrategy : verticalListSortingStrategy}
      disabled={!activo}
    >
      {children}
    </SortableContext>
  )
}

function Fila(props: PropsDeFila) {
  const { alMontar, estilo, asa } = useOrdenable(idDeFila(props.campo.id))
  return (
    <FilaDeCampo
      {...props}
      alMontar={alMontar}
      estilo={estilo}
      asa={<AsaDeArrastre etiqueta={`Mover «${props.campo.etiqueta}»`} asa={asa} />}
    />
  )
}

function Fijo(props: PropsDeFijo) {
  const { alMontar, estilo, asa } = useArrastrable(idDeFijo(props.llave), CONTENEDOR_DE_CASILLAS)
  return (
    <FilaFija
      {...props}
      alMontar={alMontar}
      estilo={estilo}
      asa={
        <AsaDeArrastre etiqueta={`Mover «${props.etiqueta}» a ${props.textos.zona}`} asa={asa} />
      }
    />
  )
}

function Casilla(props: PropsDeCasilla) {
  const { alMontar, estilo, asa } = useOrdenable(idDeCasilla(props.casilla.llave))
  return (
    <CasillaLlena
      {...props}
      alMontar={alMontar}
      estilo={estilo}
      asa={
        <AsaDeArrastre etiqueta={`Mover «${props.casilla.etiqueta}» en ${props.zona}`} asa={asa} />
      }
    />
  )
}

function Libre(props: PropsDeLibre) {
  const alMontar = useLibre(idDeCasillaLibre(props.posicion), CONTENEDOR_DE_CASILLAS)
  return <CasillaLibre {...props} alMontar={alMontar} />
}

// Los envoltorios del cuerpo con el arrastre: cada fila, casilla y lugar libre se registra en el `DndContext` de `CuerpoConArrastre`.
export const ARRASTRABLES: Envoltorios = { Lista, Fila, Fijo, Casilla, Libre }
