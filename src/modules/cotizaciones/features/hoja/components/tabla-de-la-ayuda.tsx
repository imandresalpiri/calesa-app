'use client'

import { useRef, useState } from 'react'
import { cn } from 'cn'
import { textoDelTope } from '@/shared/lib/conteo'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { Monto } from '@/shared/ui/monto'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useRegional } from '@/shared/ui/regional'
import { useDesborde } from '@/shared/ui/use-desborde'
import { nombreDelValor, type DestinoDeLaAyuda } from '../../../entities/destino-de-la-ayuda'
import { filasAMostrar } from '../../../entities/fila-del-vehiculo'
import {
  celdaDeTabla,
  type CeldaDeTabla,
  type ColumnaDeTabla,
  type FilaDeTabla,
  type TablaDeAyuda,
} from '../../../entities/tabla-de-ayuda'

export type PropsDeLaTablaDeLaAyuda = {
  tabla: TablaDeAyuda
  // Las que dibuja el bloque (`columnasDelBloque`), en su orden.
  columnas: readonly ColumnaDeTabla[]
  // Si la celda que abre la ayuda es dinero (P13): sus cifras pasan por `<Monto>` con la moneda de la celda (nula, la de la empresa) y el Modo Live las tapa. Nulo, a la vista.
  dinero: { moneda: string | undefined } | null
  // Las columnas cuyas cifras llenan una celda que quien mira puede tipear ahora (`destinosDelBloque`), por su clave. Sin ellas o sin `alElegir`, todo es texto.
  llenaPor?: ReadonlyMap<string, DestinoDeLaAyuda> | undefined
  alElegir?: ((destino: DestinoDeLaAyuda, valor: number) => void) | undefined
  // La fila del vehículo (`filaDelVehiculo`): resaltada con «Tu vehículo» y siempre entre las dibujadas.
  filaResaltada?: number | null | undefined
}

// Cómo se elige un valor: el destino de cada columna, qué hace el clic y el nombre del botón (con el Modo Live ya resuelto).
type Eleccion = {
  llenaPor: ReadonlyMap<string, DestinoDeLaAyuda>
  alElegir: (destino: DestinoDeLaAyuda, valor: number) => void
  nombre: (destino: DestinoDeLaAyuda, valor: number) => string
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

function ContenidoDeLaCelda({
  celda,
  dinero,
}: {
  celda: CeldaDeTabla
  dinero: PropsDeLaTablaDeLaAyuda['dinero']
}) {
  return celda.tipo === 'cifra' && dinero !== null ? (
    <Monto valor={celda.valor} moneda={dinero.moneda} />
  ) : (
    celda.texto
  )
}

// Una fila: cada cifra de una columna que llena es un botón que la escribe en su celda (lo que se ve no cambia; el nombre dice qué hace). La del vehículo va resaltada y
// con «Tu vehículo» delante de su primer valor.
function FilaDeLaAyuda({
  fila,
  columnas,
  dinero,
  eleccion,
  delVehiculo,
}: {
  fila: FilaDeTabla
  columnas: readonly ColumnaDeTabla[]
  dinero: PropsDeLaTablaDeLaAyuda['dinero']
  eleccion: Eleccion | null
  delVehiculo: boolean
}) {
  const { locale } = useRegional()
  return (
    <tr
      data-fila-del-vehiculo={delVehiculo ? '' : undefined}
      className={cn(
        'border-b border-(--color-line) last:border-b-0',
        delVehiculo && 'bg-(--color-primario-soft)',
      )}
    >
      {columnas.map((columna, j) => {
        const celda = celdaDeTabla(fila[columna.clave], columna.tipo, locale)
        const destino = eleccion?.llenaPor.get(columna.clave)
        const contenido = <ContenidoDeLaCelda celda={celda} dinero={dinero} />
        return (
          <td
            key={columna.clave}
            className={cn(
              'px-3 py-2 align-top',
              celda.tipo === 'cifra'
                ? 'text-right whitespace-nowrap tabular-nums'
                : 'wrap-anywhere',
            )}
          >
            {delVehiculo && j === 0 ? (
              <span className="me-2 inline-flex rounded-4xl bg-(--color-primario) px-2 py-0.5 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-sobre-primario)">
                Tu vehículo
              </span>
            ) : null}
            {eleccion && destino && celda.tipo === 'cifra' ? (
              <button
                type="button"
                aria-label={eleccion.nombre(destino, celda.valor)}
                className="-mx-2 -my-1 inline-flex min-h-11 min-w-11 items-center justify-end rounded-(--radius-sm) px-2 font-medium text-(--color-primario-ink) underline decoration-dotted underline-offset-4 outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus)"
                onClick={() => {
                  eleccion.alElegir(destino, celda.valor)
                }}
              >
                {contenido}
              </button>
            ) : (
              contenido
            )}
          </td>
        )
      })}
    </tr>
  )
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
}: PropsDeLaTablaDeLaAyuda) {
  const contenedor = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(contenedor)
  const eleccion = useEleccion(llenaPor, alElegir)
  const [pedidas, setPedidas] = useState(TAMANO_DE_VER_MAS)
  const filas = tabla.filas.slice(0, filasAMostrar(pedidas, filaResaltada))
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
    </div>
  )
}
