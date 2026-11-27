'use client'

import { useRef } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import type { Planilla } from '../../../hooks/use-planilla'
import { BuscarFila } from '../comunes/buscar-fila'
import { TablaDeLaCuadricula } from './tabla-de-la-cuadricula'

type Props = { planilla: Planilla; nombreDelOrigen: string }

// El marco de la cuadrícula: «Buscar fila» (por concepto: el camino a lo que el tope deja fuera), la tabla en su marco que se desplaza de costado (en el celular y con
// el texto al 200 %: la página nunca se ensancha), el vacío de una fórmula sin filas, el de una búsqueda sin coincidencias y el aviso del tope.
export function CuadriculaDeLaPlanilla({ planilla, nombreDelOrigen }: Props) {
  const marco = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(marco)
  const { hoja, vista, busqueda } = planilla
  const buscando = busqueda.trim() !== ''
  const sinFilas = hoja.filas.length === 0
  const conTabla =
    (!sinFilas || hoja.gruposSinFilas.length > 0) && !(buscando && vista.sinCoincidencias)
  return (
    <div className="grid min-w-0 gap-2">
      {sinFilas ? null : <BuscarFila valor={busqueda} alCambiar={planilla.setBusqueda} />}
      {sinFilas ? (
        <EstadoVacio
          compacto
          titulo="Esta fórmula no tiene filas."
          descripcion="Cada fila es un concepto de la cotización: un valor, lo que escribe el asesor o un cálculo con otras filas."
          accion={
            planilla.editor.soloLectura ? undefined : (
              <Button
                className="min-h-[44px] md:min-h-9"
                onClick={() => {
                  planilla.ops.insertar(null, 'abajo')
                }}
              >
                Sumar la primera fila
              </Button>
            )
          }
        />
      ) : null}
      {conTabla ? (
        <div className="relative min-w-0">
          <div
            ref={marco}
            className="@container/planilla min-w-0 overflow-x-auto rounded-(--radius-lg) border border-(--color-line)"
          >
            <TablaDeLaCuadricula planilla={planilla} nombreDelOrigen={nombreDelOrigen} />
          </div>
          <PistaDeDesborde {...desborde} />
        </div>
      ) : null}
      {buscando && vista.sinCoincidencias ? (
        <EstadoSinResultados
          descripcion={`Ninguna fila tiene «${busqueda.trim()}» en el concepto.`}
        />
      ) : null}
      {vista.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_LO_CARGADO, { orden: 'primeras filas', articulo: 'las' })}
          camino="Busca una fila por su concepto."
        />
      ) : null}
    </div>
  )
}
