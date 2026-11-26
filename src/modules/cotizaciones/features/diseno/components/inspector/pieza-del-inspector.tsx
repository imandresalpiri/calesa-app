'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { esItemConNodo, type ClaveDePieza } from '../../../../entities/diseno'
import {
  claveDeLaUbicacion,
  ubicarLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import type { ApoyoDelInspector } from './apoyo-del-inspector'
import { InspectorDeAtajos } from './inspector-de-atajos'
import { InspectorDeLaCabecera } from './inspector-de-la-cabecera'
import { InspectorDeLaCelda } from './inspector-de-la-celda'
import { InspectorDeLaSeccion } from './inspector-de-la-seccion'
import { InspectorDeLaVariante } from './inspector-de-la-variante'
import { InspectorDelInterruptor } from './inspector-del-interruptor'
import { InspectorDelTotal } from './inspector-del-total'

export const PIEZA_QUE_YA_NO_ESTA = 'Esta pieza ya no está en la hoja.'
export const FILA_QUE_YA_NO_ESTA_EN_LA_FORMULA = 'Esta fila ya no está en la fórmula.'

type Props = {
  pieza: PiezaDeLaHoja
  apoyo: ApoyoDelInspector
  alQuitar: (clave: ClaveDePieza) => void
  alUbicarElTotal: () => void
}

// Una pieza cuya fila ya no está en la fórmula (`nodo_inexistente`): lo dice con «Quitar la pieza».
function SinFila({ alQuitar, ocupado }: { alQuitar: () => void; ocupado: boolean }) {
  return (
    <Aviso tono="peligro">
      <p>{FILA_QUE_YA_NO_ESTA_EN_LA_FORMULA}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={ocupado}
        onClick={alQuitar}
      >
        Quitar la pieza
      </Button>
    </Aviso>
  )
}

export const DEL_BLOQUE =
  'Lleva la tarjeta del total suelta y las secciones que van detrás del botón «Avanzado», en una fila entera de la hoja. Arrástralo, o usa Alt+↑ y Alt+↓, para llevarlo a otra fila libre.'

const DelBloque = () => (
  <p className="text-(length:--text-sm) text-(--color-ink-soft)">{DEL_BLOQUE}</p>
)

const YaNoEsta = () => (
  <p className="text-(length:--text-sm) text-(--color-ink-soft)">{PIEZA_QUE_YA_NO_ESTA}</p>
)

// Los campos de la pieza elegida, según lo que es.
export function PiezaDelInspector({ pieza, apoyo, alQuitar, alUbicarElTotal }: Props) {
  const { trabajo, definicion } = apoyo.editor
  if (pieza.pieza === 'cabecera') return <InspectorDeLaCabecera apoyo={apoyo} />
  if (pieza.pieza === 'total') return <InspectorDelTotal apoyo={apoyo} alUbicar={alUbicarElTotal} />
  if (pieza.pieza === 'bloque-avanzado') return <DelBloque />
  if (pieza.pieza === 'seccion') {
    const seccion = trabajo.secciones.find((s) => s.id === pieza.seccion)
    return seccion === undefined ? (
      <YaNoEsta />
    ) : (
      <InspectorDeLaSeccion seccion={seccion} apoyo={apoyo} />
    )
  }
  const lugar = ubicarLaPieza(trabajo, pieza)
  if (lugar === null || !esItemConNodo(lugar.item)) return <YaNoEsta />
  const { item } = lugar
  const seccion = lugar.seccion.id
  const sinFila = !definicion.nodos.some((n) => n.id === item.nodo)
  const campos = (() => {
    switch (item.tipo) {
      case 'celda':
        return <InspectorDeLaCelda seccion={lugar.seccion} celda={item} apoyo={apoyo} />
      case 'atajos':
        return <InspectorDeAtajos seccion={seccion} item={item} apoyo={apoyo} />
      case 'interruptor':
        return <InspectorDelInterruptor seccion={seccion} item={item} apoyo={apoyo} />
      case 'variante':
      case 'subtotal':
        return <InspectorDeLaVariante seccion={seccion} item={item} apoyo={apoyo} />
    }
  })()
  return (
    <div className="grid min-w-0 gap-3">
      {sinFila ? (
        <SinFila
          ocupado={apoyo.editor.ocupado}
          alQuitar={() => {
            alQuitar(claveDeLaUbicacion(lugar))
          }}
        />
      ) : null}
      {campos}
    </div>
  )
}
