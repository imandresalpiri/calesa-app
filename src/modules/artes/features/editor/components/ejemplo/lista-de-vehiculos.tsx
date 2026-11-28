'use client'

import type { ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { MINIMO_DE_BUSQUEDA_DEL_EJEMPLO } from '../../../../entities/datos/busqueda-de-vehiculos'
import type { EstadoDeLaBusqueda } from '../../hooks/use-busqueda-de-vehiculos'
import { FilaDeVehiculo } from './fila-de-vehiculo'

type Props = {
  estado: EstadoDeLaBusqueda
  origen: string
  elegidoId: string | null
  alElegir: (id: string) => void
  verMas: () => void
  reintentar: () => void
}

const CAMINO_DEL_TOPE = 'Busca por título, VIN o lote para encontrar otro.'

function Mensaje({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-(length:--text-sm) text-(--color-ink-soft)"
    >
      {children}
    </div>
  )
}

function textoDelVacio(origen: string, texto: string | null): string {
  return texto === null
    ? `${origen} todavía no tiene vehículos.`
    : `Ningún vehículo de ${origen} coincide con «${texto}».`
}

// Lo de debajo de la lista, en su renglón: «Ver más», el tope con el camino a lo que no se ve o lo que no llegó con «Reintentar».
function PieDeLaLista({
  estado,
  verMas,
}: {
  estado: Extract<EstadoDeLaBusqueda, { tipo: 'lista' }>
  verMas: () => void
}) {
  if (estado.enTope) {
    return (
      <AvisoDeTope
        texto={textoDelTope(TOPE_DE_LO_CARGADO, { sustantivo: 'vehículos' })}
        camino={CAMINO_DEL_TOPE}
      />
    )
  }
  if (estado.errorDeMas !== null) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        {estado.errorDeMas}
        <Button type="button" variant="outline" size="xs" onClick={verMas}>
          Reintentar
        </Button>
      </p>
    )
  }
  if (!estado.hayMas) {
    return null
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={estado.cargandoMas}
      onClick={verMas}
    >
      {estado.cargandoMas ? 'Cargando…' : 'Ver más'}
    </Button>
  )
}

// La lista de vehículos del popover, en su caja de alto fijo con su propio desplazamiento: buscando, lo escrito que no alcanza, sin
// coincidencias, sin vehículos y lo que no se pudo leer (con «Reintentar») se dicen en la misma caja.
export function ListaDeVehiculos({
  estado,
  origen,
  elegidoId,
  alElegir,
  verMas,
  reintentar,
}: Props) {
  if (estado.tipo === 'corta') {
    return <Mensaje>{MINIMO_DE_BUSQUEDA_DEL_EJEMPLO.aviso}</Mensaje>
  }
  if (estado.tipo === 'cargando') {
    return (
      <div aria-busy className="grid content-start gap-1.5 px-1.5 py-1.5">
        <span className="sr-only">Buscando vehículos…</span>
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-11" />
        ))}
      </div>
    )
  }
  if (estado.tipo === 'error') {
    return (
      <Mensaje>
        {estado.mensaje}
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </Mensaje>
    )
  }
  if (estado.tipo === 'vacia') {
    return <Mensaje>{textoDelVacio(origen, estado.texto)}</Mensaje>
  }
  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-y-auto">
      <div className="grid content-start gap-1 py-1">
        <ul aria-label="Vehículos" className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
          {estado.filas.map((fila) => (
            <FilaDeVehiculo
              key={fila.id}
              fila={fila}
              elegida={fila.id === elegidoId}
              alElegir={alElegir}
            />
          ))}
        </ul>
        <div className="flex min-h-8 items-center justify-center px-1.5">
          <PieDeLaLista estado={estado} verMas={verMas} />
        </div>
      </div>
    </div>
  )
}
