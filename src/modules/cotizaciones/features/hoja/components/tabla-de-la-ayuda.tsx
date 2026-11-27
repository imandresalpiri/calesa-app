'use client'

import { useRef, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { textoDelTope } from '@/shared/lib/conteo'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useRegional } from '@/shared/ui/regional'
import { useDesborde } from '@/shared/ui/use-desborde'
import { nombreDelValor, type DestinoDeLaAyuda } from '../../../entities/destino-de-la-ayuda'
import { filasAMostrar } from '../../../entities/fila-del-vehiculo'
import type { ColumnaDeTabla, TablaDeAyuda } from '../../../entities/tabla-de-ayuda'
import {
  FilaDeLaAyuda,
  type DineroDeLaAyuda,
  type Eleccion,
  type FilaEditadaDeLaAyuda,
} from './fila-de-la-ayuda'

export type PropsDeLaTablaDeLaAyuda = {
  tabla: TablaDeAyuda
  // Las que dibuja el bloque (`columnasDelBloque`), en su orden.
  columnas: readonly ColumnaDeTabla[]
  // Si la celda que abre la ayuda es dinero (P13): sus cifras pasan por `<Monto>` con la moneda de la celda (nula, la de la empresa), sin ella con el Modo Live. Nulo, a la vista.
  dinero: DineroDeLaAyuda
  // Las columnas cuyas cifras llenan una celda que quien mira puede tipear ahora (`destinosDelBloque`), por su clave. Sin ellas o sin `alElegir`, todo es texto.
  llenaPor?: ReadonlyMap<string, DestinoDeLaAyuda> | undefined
  alElegir?: ((destino: DestinoDeLaAyuda, valor: number) => void) | undefined
  // La fila del vehículo (`filaDelVehiculo`): resaltada con «Tu vehículo» y siempre entre las dibujadas.
  filaResaltada?: number | null | undefined
}

// Lo que suma la edición desde la ayuda (el hueco `EdicionDeLaTabla`, del área `tablas`): qué pone en cada fila, la fila abierta (siempre entre las dibujadas) y lo de
// debajo de las filas («+ Añadir fila», sus avisos). Sin ella, la tabla sólo se consulta.
export type EdicionEnLaTablaDeLaAyuda = {
  fila: (indice: number) => FilaEditadaDeLaAyuda
  abierta: number | null
  pie: ReactNode
}

const esCifra = (columna: ColumnaDeTabla) => columna.tipo === 'numero'

// Lo que hay debajo de las filas: «Ver más filas» mientras queden leídas sin dibujar y, dibujadas todas, el tope de la lectura si había más (el camino es la configuración).
function PieDeLaTabla({
  tabla,
  dibujadas,
  alVerMas,
}: {
  tabla: TablaDeAyuda
  dibujadas: number
  alVerMas: () => void
}) {
  if (dibujadas < tabla.filas.length) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alVerMas}
      >
        Ver más filas
      </Button>
    )
  }
  return tabla.hayMas ? (
    <AvisoDeTope
      texto={textoDelTope(tabla.filas.length, { articulo: 'las', orden: 'primeras filas' })}
      camino="Hay más filas: mira la tabla en la configuración."
    />
  ) : null
}

function useEleccion(
  llenaPor: PropsDeLaTablaDeLaAyuda['llenaPor'],
  alElegir: PropsDeLaTablaDeLaAyuda['alElegir'],
): Eleccion | null {
  const regional = useRegional()
  const { live } = useLive()
  if (!llenaPor || llenaPor.size === 0 || !alElegir) {
    return null
  }
  return {
    llenaPor,
    alElegir,
    nombre: (destino, valor) => nombreDelValor(destino, valor, regional, live),
  }
}

// La tabla de referencia de un bloque de la ayuda: un encabezado por columna (fijo arriba al desplazar), las filas en el orden que llegan, de a `TAMANO_DE_VER_MAS` con
// «Ver más filas» (hasta las 1.000 que lee; la del vehículo, siempre). El texto se parte y una cifra no; lo que aún no entra se desplaza de costado dentro de su propio
// contenedor, nunca la página.
export function TablaDeLaAyuda({
  tabla,
  columnas,
  dinero,
  llenaPor,
  alElegir,
  filaResaltada = null,
  edicion = null,
}: PropsDeLaTablaDeLaAyuda & { edicion?: EdicionEnLaTablaDeLaAyuda | null }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(contenedor)
  const eleccion = useEleccion(llenaPor, alElegir)
  const [pedidas, setPedidas] = useState(TAMANO_DE_VER_MAS)
  const aLaVista = Math.max(filaResaltada ?? -1, edicion?.abierta ?? -1)
  const filas = tabla.filas.slice(0, filasAMostrar(pedidas, aLaVista === -1 ? null : aLaVista))
  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative min-w-0">
        <div
          ref={contenedor}
          role="region"
          aria-label={`Tabla ${tabla.nombre}`}
          tabIndex={0}
          className="max-h-[60dvh] min-w-0 overflow-auto rounded-md border border-(--color-line)"
        >
          <table className="w-full border-collapse text-(length:--text-sm) text-(--color-ink)">
            <thead>
              <tr>
                {columnas.map((columna) => (
                  <th
                    key={columna.clave}
                    scope="col"
                    className={cn(
                      'sticky top-0 z-10 border-b border-(--color-line) bg-(--color-surface) px-3 py-2 font-medium wrap-anywhere',
                      esCifra(columna) ? 'text-right' : 'text-left',
                    )}
                  >
                    {columna.etiqueta}
                  </th>
                ))}
                {edicion ? (
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-(--color-line) bg-(--color-surface) px-2 py-2"
                  >
                    <span className="sr-only">Acciones</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <FilaDeLaAyuda
                  // Las filas no tienen id y no se reordenan con la tabla abierta: la posición las distingue.
                  key={i}
                  fila={fila}
                  columnas={columnas}
                  dinero={dinero}
                  eleccion={eleccion}
                  delVehiculo={i === filaResaltada}
                  editada={edicion ? edicion.fila(i) : null}
                />
              ))}
            </tbody>
          </table>
        </div>
        <PistaDeDesborde {...desborde} />
      </div>
      <PieDeLaTabla
        tabla={tabla}
        dibujadas={filas.length}
        alVerMas={() => {
          setPedidas(filas.length + TAMANO_DE_VER_MAS)
        }}
      />
      {edicion?.pie}
    </div>
  )
}
