'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useContext, type ComponentType } from 'react'
import { consultaDelDrawerDeLasTablas, rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import { EstadoVacio } from '@/shared/ui/estados'
import type { ContextoDeHoja } from '../../../../entities/binding'
import { destinosDelBloque, type DestinoDeLaAyuda } from '../../../../entities/destino-de-la-ayuda'
import { filaDelVehiculo } from '../../../../entities/fila-del-vehiculo'
import type { BloqueEnLaHoja } from '../../../../entities/hoja'
import type { DeDondeCalcula } from '../../../../entities/pedido-de-recalculo'
import { pideRecargar } from '../../../../entities/recalculo'
import { columnasDelBloque, type TablaDeAyuda } from '../../../../entities/tabla-de-ayuda'
import type { PropsDeLaEdicionDeLaTabla } from '../huecos'
import { TablaDeLaAyuda, type PropsDeLaTablaDeLaAyuda } from '../tabla-de-la-ayuda'
import { FalloDeLaTabla, LeyendoLaTabla } from './estados-de-la-tabla'
import { ContextoDeLaEdicionDeLaTabla } from './hueco-de-la-edicion'
import { useTablaDeLaAyuda } from './use-tabla-de-la-ayuda'

export type BloqueDeTablaEnLaHoja = Extract<BloqueEnLaHoja, { tipo: 'tabla' }>

type Props = {
  bloque: BloqueDeTablaEnLaHoja
  lectura: DeDondeCalcula
  dinero: PropsDeLaTablaDeLaAyuda['dinero']
  contexto: ContextoDeHoja
  // El rótulo de la celda que abre la ayuda: la nota de la tabla publicada desde aquí.
  rotulo: string
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

// «Editar en la configuración»: a quien configura, donde la tabla no se edita aquí (una guardada), el drawer de tablas del origen con esa tabla abierta.
function EditarEnLaConfiguracion({ origenId, tablaId }: { origenId: string; tablaId: string }) {
  return (
    <Link
      href={rutaDeParteDelOrigen(
        origenId,
        'planilla',
        consultaDelDrawerDeLasTablas({ tabla: tablaId }),
      )}
      className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) font-medium text-(--color-primario-ink) underline underline-offset-4 md:min-h-8"
    >
      Editar en la configuración
    </Link>
  )
}

// Lo que llenó el área `tablas` (el componente llega del contexto: se dibuja aquí, con sus props).
function EdicionDelHueco({
  Edicion,
  ...props
}: PropsDeLaEdicionDeLaTabla & { Edicion: ComponentType<PropsDeLaEdicionDeLaTabla> }) {
  return <Edicion {...props} />
}

type PropsDeLaTablaLeida = Omit<Props, 'lectura'> & {
  tabla: TablaDeAyuda
  alPublicada: PropsDeLaEdicionDeLaTabla['alPublicada']
}

// Lo leído: el nombre de la tabla arriba y sus filas con las columnas del bloque. A quien configura (sólo a él le llega el id de la tabla viva), el aviso de cada columna que
// el bloque pide y la tabla ya no tiene; a los demás, la columna simplemente no se dibuja. Con el hueco de la edición (la hoja nueva de quien configura), la
// tabla se edita ahí mismo; si no, a quien configura, el camino a la configuración.
function TablaLeida({
  bloque,
  tabla,
  dinero,
  contexto,
  rotulo,
  alElegir,
  alPublicada,
}: PropsDeLaTablaLeida) {
  const Edicion = useContext(ContextoDeLaEdicionDeLaTabla)
  const { columnas, faltan } = columnasDelBloque(
    tabla,
    bloque.columnas === null ? null : bloque.columnas.map((c) => c.columna),
  )
  const base: PropsDeLaTablaDeLaAyuda = {
    tabla,
    columnas,
    dinero,
    llenaPor: alElegir ? destinosDelBloque(contexto, bloque.columnas) : undefined,
    alElegir,
    filaResaltada: filaResaltadaDe(bloque, tabla, contexto),
  }
  const seEdita = Edicion !== null && bloque.id !== null
  const quieta =
    tabla.filas.length === 0 ? (
      <EstadoVacio compacto titulo="Esta tabla no tiene filas." />
    ) : (
      <TablaDeLaAyuda {...base} />
    )
  const enLaConfiguracion =
    bloque.id !== null && contexto.origenId !== undefined ? (
      <EditarEnLaConfiguracion origenId={contexto.origenId} tablaId={bloque.id} />
    ) : null
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
      {seEdita && bloque.id !== null ? (
        <EdicionDelHueco
          Edicion={Edicion}
          tabla={{ id: bloque.id, nombre: tabla.nombre }}
          rotulo={rotulo}
          base={base}
          enLaConfiguracion={enLaConfiguracion}
          quieta={quieta}
          alPublicada={alPublicada}
        />
      ) : (
        quieta
      )}
      {seEdita ? null : enLaConfiguracion}
    </div>
  )
}

// Un bloque de tabla: lee la suya al montarse (de donde calcula la hoja) y resuelve sus estados sin tocar los demás bloques. Sin permiso (la tabla se desactivó o dejó de
// verse), «Esta tabla ya no está disponible.», sin cifras.
export function BloqueDeTabla({ bloque, lectura, ...resto }: Props) {
  const leer = useTablaDeLaAyuda(bloque.tabla, lectura)
  const router = useRouter()
  // Publicada desde aquí: si este origen pasó a la versión siguiente de su fórmula, la página se vuelve a pedir (llega otra hoja abierta, la hoja se vuelve a montar y lo
  // tipeado vuelve del borrador); si no (ninguna fórmula de este origen la usa), la tabla se lee de nuevo.
  const alPublicada: PropsDeLaEdicionDeLaTabla['alPublicada'] = ({ formulas }) => {
    if (formulas.some((f) => f.origenId === resto.contexto.origenId)) {
      startTransition(() => {
        router.refresh()
      })
      return 'hoja'
    }
    leer.olvidarYLeer()
    return 'tabla'
  }
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
  return (
    <TablaLeida bloque={bloque} tabla={leer.lectura.dato} alPublicada={alPublicada} {...resto} />
  )
}
