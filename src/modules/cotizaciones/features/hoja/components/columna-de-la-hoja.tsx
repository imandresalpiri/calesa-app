'use client'

import type { ReactNode } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { useHoja } from '../hooks/use-hoja'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { PasosDeLaHoja, type PasosDeLaPagina } from './pasos-de-la-hoja'
import { RegionDelAvisoDePisado } from './pisadas'
import { SeccionesDeLaHoja } from './secciones-de-la-hoja'

// La columna de la izquierda: lo que se pone encima (el aviso de versión de una guardada), la cabecera (modos y «Ver total Bs»), los pasos, el aviso de la primera vez
// que se pisa un cálculo y las secciones del diseño.
export function ColumnaDeLaHoja({
  hoja,
  h,
  contexto,
  secciones,
  guardando,
  soloLectura,
  encima,
  alRecargar,
  pasos,
}: {
  hoja: HojaLista
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  secciones: HojaLista['secciones']
  guardando: boolean
  soloLectura: boolean
  encima: ReactNode
  alRecargar: () => void
  pasos: PasosDeLaPagina | undefined
}) {
  return (
    <div className="grid min-w-0 flex-1 gap-4">
      {encima}
      <CabeceraDeHoja
        cabecera={hoja.cabecera}
        modoElegido={h.entradas.modoTc}
        alElegirModo={h.acciones.alElegirModo}
        verTotalBs={h.verTotalBs}
        alCambiarVerTotalBs={h.alCambiarVerTotalBs}
        deshabilitado={soloLectura}
        origen={hoja.origen.nombre}
        formula={hoja.formula}
      />
      {pasos ? <PasosDeLaHoja pasos={pasos} respuesta={h.respuesta} /> : null}
      <RegionDelAvisoDePisado visible={h.avisoDePisado} alCerrar={h.cerrarAvisoDePisado} />
      <SeccionesDeLaHoja
        secciones={secciones}
        contexto={contexto}
        acciones={h.acciones}
        guardando={guardando}
        de={h.de}
        formula={hoja.formula}
        alRecargar={alRecargar}
      />
    </div>
  )
}
