import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { abrirLaPestana } from '../abrir-la-pestana'
import { BandejaDelOrigen } from '../bandeja-del-dia'
import { BarraDeLogistica } from '../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'

export const metadata: Metadata = { title: 'Bandeja del día · Logística' }

// `/logistica/bandeja`: la bandeja del día del origen elegido (lo que le toca hoy a quien mira, por grupos y con su acción). Sin `?origen=`, el último que usó la
// persona. Cada grupo lleva «Ver todos» → `/logistica/bandeja/[grupo]` en el mismo origen.
export default function PaginaDeLaBandeja({ searchParams }: PageProps<'/logistica/bandeja'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso. Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Bandeja del día</h1>
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="bandeja" />
      </Suspense>
      <Suspense fallback={<EsqueletoDeLaBandeja />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Contenido({ searchParams }: Pick<PageProps<'/logistica/bandeja'>, 'searchParams'>) {
  const abierta = await abrirLaPestana(searchParams, 'bandeja')
  if (abierta.tipo === 'estado') return abierta.estado
  return <BandejaDelOrigen permisos={abierta.permisos} origenId={abierta.origen.id} />
}
