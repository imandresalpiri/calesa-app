'use client'

import { EstadoVacio } from '@/shared/ui/estados'
import type { ContextoDeHoja } from '../../../../entities/binding'
import { destinosDelBloque, type DestinoDeLaAyuda } from '../../../../entities/destino-de-la-ayuda'
import { filaDelVehiculo } from '../../../../entities/fila-del-vehiculo'
import type { BloqueEnLaHoja } from '../../../../entities/hoja'
import type { DeDondeCalcula } from '../../../../entities/pedido-de-recalculo'
import { pideRecargar } from '../../../../entities/recalculo'
import { columnasDelBloque, type TablaDeAyuda } from '../../../../entities/tabla-de-ayuda'
import { TablaDeLaAyuda, type PropsDeLaTablaDeLaAyuda } from '../tabla-de-la-ayuda'
import { FalloDeLaTabla, LeyendoLaTabla } from './estados-de-la-tabla'
import { useTablaDeLaAyuda } from './use-tabla-de-la-ayuda'

export type BloqueDeTablaEnLaHoja = Extract<BloqueEnLaHoja, { tipo: 'tabla' }>

type Props = {
  bloque: BloqueDeTablaEnLaHoja
  lectura: DeDondeCalcula
  dinero: PropsDeLaTablaDeLaAyuda['dinero']
  contexto: ContextoDeHoja
  // Escribe en la hoja una cifra de una columna que llena (`useAplicarDesdeLaAyuda`). Sin él, todas las cifras son texto.
  alElegir: ((destino: DestinoDeLaAyuda, valor: number) => void) | undefined
}

// La fila de «Tu vehículo», sólo con un vehículo elegido que quien mira ve (`valoresDelVehiculo`, que manda la página) y si el bloque lo pide: los nodos que casan salen del
// último recálculo y los campos, del vehículo.
function filaResaltadaDe(
  bloque: BloqueDeTablaEnLaHoja,
  tabla: TablaDeAyuda,
  contexto: ContextoDeHoja,
): number | null {
  const delVehiculo = contexto.valoresDelVehiculo
  if (!bloque.resaltar || delVehiculo === undefined) {
    return null
  }
  return filaDelVehiculo(tabla.filas, bloque.casa, {
    deNodo: (nodo) => contexto.respuesta?.valores.get(nodo),
    delVehiculo,
  })
}

function TituloDeLaTabla({ nombre }: { nombre: string }) {
  return (
    <h3 className="text-(length:--text-xs) font-medium tracking-wide break-words text-(--color-ink-soft) uppercase">
      {nombre}
    </h3>
  )
}

// Lo leído: el nombre de la tabla arriba y sus filas con las columnas del bloque. A quien configura (sólo a él le llega el id de la tabla viva), el aviso de cada columna que
// el bloque pide y la tabla ya no tiene; a los demás, la columna simplemente no se dibuja.
function TablaLeida({
  bloque,
  tabla,
  dinero,
  contexto,
  alElegir,
}: Omit<Props, 'lectura'> & { tabla: TablaDeAyuda }) {
  const { columnas, faltan } = columnasDelBloque(
    tabla,
    bloque.columnas === null ? null : bloque.columnas.map((c) => c.columna),
  )
  return (
    <div className="grid min-w-0 gap-2">
      <TituloDeLaTabla nombre={tabla.nombre} />
      {bloque.id === null
        ? null
        : faltan.map((columna) => (
            <p key={columna} className="text-(length:--text-sm) text-(--color-aviso-ink)">
              La columna «{columna}» ya no está en la tabla.
            </p>
          ))}
      {tabla.filas.length === 0 ? (
        <EstadoVacio compacto titulo="Esta tabla no tiene filas." />
      ) : (
        <TablaDeLaAyuda
          tabla={tabla}
          columnas={columnas}
          dinero={dinero}
          llenaPor={alElegir ? destinosDelBloque(contexto, bloque.columnas) : undefined}
          alElegir={alElegir}
          filaResaltada={filaResaltadaDe(bloque, tabla, contexto)}
        />
      )}
    </div>
  )
}

// Un bloque de tabla: lee la suya al montarse (de donde calcula la hoja) y resuelve sus estados sin tocar los demás bloques. Sin permiso (la tabla se desactivó o dejó de
// verse), «Esta tabla ya no está disponible.», sin cifras.
export function BloqueDeTabla({ bloque, lectura, ...resto }: Props) {
  const leer = useTablaDeLaAyuda(bloque.tabla, lectura)
  if (leer.lectura.estado === 'leyendo') {
    return <LeyendoLaTabla />
  }
  if (leer.lectura.estado === 'fallo') {
    const { error } = leer.lectura
    return (
      <FalloDeLaTabla
        recargar={pideRecargar(error)}
        sinPermiso={error.codigo === 'sin_permiso'}
        alReintentar={leer.reintentar}
      />
    )
  }
  return <TablaLeida bloque={bloque} tabla={leer.lectura.dato} {...resto} />
}
