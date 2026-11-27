'use client'

import type { ReactNode } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { useHoja } from '../hooks/use-hoja'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { PasosDeLaHoja } from './pasos-de-la-hoja'
import { RegionDelAvisoDePisado } from './pisadas'
import { SeccionesDeLaHoja } from './secciones-de-la-hoja'

// La columna de la hoja: lo que se pone encima (el aviso de versión de una guardada), la cabecera (modos, «Ver total en moneda local» y el ⚙, que suben a la ranura de
// la cabecera de la página si la hay), los pasos («Privada · Vista previa»), el aviso de la primera vez que se pisa un cálculo y las secciones del diseño con el total
// suelto y el cierre.
export function ColumnaDeLaHoja({
  hoja,
  h,
  contexto,
  secciones,
  guardando,
  soloLectura,
  encima,
  alRecargar,
  privada,
  totalSuelto,
  cierre,
}: {
  hoja: HojaLista
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  secciones: HojaLista['secciones']
  guardando: boolean
  soloLectura: boolean
  encima: ReactNode
  alRecargar: () => void
  privada: ReactNode
  totalSuelto: ReactNode
  cierre: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-4">
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
      <PasosDeLaHoja privada={privada} />
      <RegionDelAvisoDePisado visible={h.avisoDePisado} alCerrar={h.cerrarAvisoDePisado} />
      <SeccionesDeLaHoja
        secciones={secciones}
        todas={hoja.secciones}
        avanzado={hoja.avanzado}
        contexto={contexto}
        acciones={h.acciones}
        guardando={guardando}
        de={h.de}
        formula={hoja.formula}
        alRecargar={alRecargar}
        totalSuelto={totalSuelto}
        cierre={cierre}
      />
    </div>
  )
}
