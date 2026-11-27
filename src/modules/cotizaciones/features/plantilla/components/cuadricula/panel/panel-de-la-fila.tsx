'use client'

import { useState } from 'react'
import {
  ALTO_DE_FILA,
  type FilaDeLaTarjeta,
  type OcultarSi,
  type PlantillaEnCuadricula,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { nodosParaElegir } from '../../../../../entities/plantilla/edicion/datos-para-elegir'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CampoDeNumero } from './campo-de-numero'
import { CondicionesDeLaFilaDiferidas } from './diferidos'
import { Eleccion } from './eleccion'
import { SeccionDelPanel } from './seccion-del-panel'

type Props = {
  plantilla: PlantillaEnCuadricula
  fila: number
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  hacer: (accion: AccionDelEditor) => void
}

const OCULTAR: readonly { valor: OcultarSi; texto: string }[] = [
  { valor: 'nunca', texto: 'Nunca' },
  { valor: 'no_aplica', texto: 'Si no aplica' },
  { valor: 'no_aplica_o_cero', texto: 'Si no aplica o vale 0' },
  { valor: 'condiciones', texto: 'Según condiciones' },
]

// Lo elegido en «Ocultar la fila»: lo de la fila, o «Según condiciones» mientras se arman; vuelve a lo de la fila si ella cambia afuera (deshacer, otra fila).
function useOcultarElegido(f: FilaDeLaTarjeta | undefined) {
  const deLaFila: OcultarSi = f?.ocultar_si ?? 'nunca'
  const marca = `${f?.id ?? ''}:${deLaFila}`
  const [ocultar, setOcultar] = useState<OcultarSi>(deLaFila)
  const [previo, setPrevio] = useState(marca)
  if (marca !== previo) {
    setPrevio(marca)
    setOcultar(deLaFila)
  }
  return [ocultar, setOcultar] as const
}

// «Ocultar si…»: con el nodo que la decide (como T310: la fila no se dibuja si su nodo no aplica, o vale 0) o según condiciones. Elegir «Según condiciones» arma las
// condiciones y no cambia la fila hasta completarlas.
function OcultarLaFila({ plantilla, fila, contexto, nombrados, hacer }: Props) {
  const f = plantilla.filas[fila]
  const [ocultar, setOcultar] = useOcultarElegido(f)
  if (f === undefined) return null
  const nodos = nodosParaElegir(contexto, nombrados).flatMap((g) => g.nodos)
  const nodo = f.nodo ?? null
  return (
    <SeccionDelPanel titulo="Ocultar si…">
      <Eleccion
        etiqueta="Ocultar la fila"
        valor={ocultar}
        opciones={OCULTAR}
        alCambiar={(elegido) => {
          setOcultar(elegido)
          if (elegido === 'condiciones') return
          hacer({
            tipo: 'ocultarSi',
            fila,
            ocultar: elegido,
            nodo: elegido === 'nunca' ? null : (nodo ?? nodos[0]?.id ?? null),
          })
        }}
      />
      {ocultar === 'nunca' || ocultar === 'condiciones' ? null : (
        <Eleccion
          etiqueta="El nodo que la decide"
          valor={nodo ?? ''}
          opciones={nodos.map((n) => ({
            valor: n.id,
            texto: n.restringido ? `${n.etiqueta} (restringido)` : n.etiqueta,
          }))}
          alCambiar={(elegido) => {
            hacer({ tipo: 'ocultarSi', fila, ocultar, nodo: elegido })
          }}
        />
      )}
      {ocultar === 'condiciones' ? (
        <CondicionesDeLaFilaDiferidas
          key={f.id}
          fila={fila}
          si={f.si ?? []}
          clave={`fila:${f.id}`}
          contexto={contexto}
          nombrados={nombrados}
          hacer={hacer}
        />
      ) : null}
    </SeccionDelPanel>
  )
}

// Con una fila elegida: su alto (16 a 240 px) y «Ocultar si…».
export function PanelDeLaFila(props: Props) {
  const { plantilla, fila, hacer } = props
  const f = plantilla.filas[fila]
  if (f === undefined) return null
  return (
    <div className="grid min-w-0 gap-4" data-panel-de-la-fila={f.id}>
      <SeccionDelPanel titulo="Alto">
        <CampoDeNumero
          etiqueta="Alto de la fila"
          valor={f.alto}
          minimo={ALTO_DE_FILA.minimo}
          maximo={ALTO_DE_FILA.maximo}
          alCambiar={(alto) => {
            hacer({ tipo: 'alto', fila, alto })
          }}
        />
      </SeccionDelPanel>
      <OcultarLaFila {...props} />
    </div>
  )
}
