'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import type { EmbarqueLeido } from '../../../entities/transporte/embarque'
import { seccionesDelEmbarque } from '../../../entities/transporte/secciones-del-embarque'
import { NINGUNO_LE_FALTA } from '../../../entities/transporte/textos'
import type { HuecoParaElMenu } from '../hooks/use-menus-de-embarques'
import { useVueltaDeLosPaneles } from '../hooks/use-panel-de-embarques'
import { CabeceraDelEmbarque } from './cabecera-del-embarque'
import { SeccionDeSueltos } from './seccion-de-sueltos'
import { SeccionDelContenedor } from './seccion-del-contenedor'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'
import { VacioDelEmbarque } from './vacio-del-embarque'

type Props = {
  embarque: EmbarqueLeido
  catalogos: CatalogosParaNombrar
  // `logistica.transporte.editar` y `flujos.mover` en el origen del embarque (los decide `src/app`).
  puedeEditar: boolean
  puedeMover: boolean
  huecosDelEmbarque: readonly HuecoParaElMenu[]
  huecosDelContenedor: readonly HuecoParaElMenu[]
  // `?falta=1`: la base trajo sólo los vehículos con algo que falta.
  falta: boolean
}

// La página de un embarque (`/logistica/embarques/<id>`): la cabecera y, un solo nivel debajo, una sección por contenedor con sus vehículos y «Sueltos» al final. Con `?falta=1` sólo
// se ven los contenedores que llevan alguno de esos vehículos.
export function FichaDelEmbarque(props: Props) {
  const { embarque: e, falta, puedeMover, huecosDelContenedor } = props
  useVueltaDeLosPaneles()
  const editable = props.puedeEditar && e.editable
  const secciones = seccionesDelEmbarque(e)
  const contenedores = falta
    ? secciones.contenedores.filter((s) => s.vehiculos.length > 0)
    : secciones.contenedores
  const vacio = contenedores.length === 0 && e.vehiculos.length === 0
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <CabeceraDelEmbarque
        embarque={e}
        catalogos={props.catalogos}
        puedeEditar={props.puedeEditar}
        huecos={props.huecosDelEmbarque}
        falta={falta}
      />
      {vacio && falta ? (
        <div className="grid justify-items-start gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
          <p>{NINGUNO_LE_FALTA}</p>
          <Link
            href={embarqueDeLogistica(e.id, e.origenId) as Route}
            prefetch={false}
            className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
          >
            Ver todos los vehículos
          </Link>
        </div>
      ) : null}
      {vacio && !falta ? <VacioDelEmbarque puedeEditar={editable} /> : null}
      {contenedores.map((s) => (
        <SeccionDelContenedor
          key={s.contenedor.id}
          seccion={s}
          origenId={e.origenId}
          puedeEditar={editable}
          puedeMover={puedeMover}
          huecos={huecosDelContenedor}
        />
      ))}
      {secciones.otros.length > 0 ? (
        <SeccionDeSueltos
          titulo="Otros contenedores"
          tipo="otros"
          vehiculos={secciones.otros}
          origenId={e.origenId}
          puedeEditar={editable}
        />
      ) : null}
      {secciones.sueltos.length > 0 ? (
        <SeccionDeSueltos
          titulo="Sueltos"
          tipo="sueltos"
          vehiculos={secciones.sueltos}
          origenId={e.origenId}
          puedeEditar={editable}
        />
      ) : null}
    </div>
  )
}
