'use client'

import type { ReactNode } from 'react'
import { useLayoutActivo, type Categoria, type OrigenResumen } from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'
import { DatosPorGrupo } from '@/shared/ui/campos'
import { Skeleton } from '@/shared/ui/skeleton'
import type { Vehiculo } from '../../../../entities/vehiculo'
import { DatosComunes } from '../datos-comunes'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  categorias: readonly Categoria[]
}

// Tipografía de vitrina: valores más grandes y con más aire que en la ficha de trabajo.
const VITRINA = '[&_dd]:text-(length:--text-base) [&_dl]:gap-y-4 [&_h3]:text-(length:--text-base)'
const REJILLA =
  'grid grid-cols-1 gap-x-6 gap-y-4 @xl/ficha-completa:grid-cols-2 @4xl/ficha-completa:grid-cols-3'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="grid min-w-0 gap-2">
      <h3 className="font-semibold text-(--color-ink)">{titulo}</h3>
      {children}
    </section>
  )
}

// Los grupos del layout del origen, leídos al abrirse (la ficha no los manda en su documento): esqueleto mientras llegan; error con «Reintentar».
function GruposDelLayout({ vehiculo, origenId }: { vehiculo: Vehiculo; origenId: string }) {
  const { leido, reintentar } = useLayoutActivo(origenId)
  if (leido.estado === 'cargando') {
    return (
      <div aria-label="Cargando la ficha" className="grid gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (leido.estado === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No pudimos cargar la ficha del vehículo.
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  return <DatosPorGrupo campos={leido.layout.campos} atributos={vehiculo.atributos} />
}

// Lo que dice la ficha completa debajo de las fotos: título, número y origen; «Datos principales» y «Precio» (los comunes) y todos los grupos del
// layout del origen. Sólo lectura: ningún control de administración. Todo monto va con <Monto> (el Modo Live lo tapa como en el resto).
export function DatosDeLaFichaCompleta({ vehiculo, origen, categorias }: Props) {
  return (
    <div className={`@container/ficha-completa grid min-w-0 gap-6 ${VITRINA}`}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="tabular-nums">#{vehiculo.numero}</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          {origen.nombre}
        </span>
      </p>
      <Seccion titulo="Datos principales">
        <DatosComunes
          vehiculo={vehiculo}
          origen={origen}
          categorias={categorias}
          bloque="principales"
          className={REJILLA}
        />
      </Seccion>
      <Seccion titulo="Precio">
        <DatosComunes
          vehiculo={vehiculo}
          origen={origen}
          categorias={categorias}
          bloque="precio"
          className={REJILLA}
        />
      </Seccion>
      <GruposDelLayout vehiculo={vehiculo} origenId={origen.id} />
    </div>
  )
}
