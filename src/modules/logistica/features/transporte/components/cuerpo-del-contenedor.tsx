'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { embarqueDeLogistica, loteDelContenedor } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button, buttonVariants } from '@/shared/ui/button'
import { MasAcciones } from '@/shared/ui/lista'
import type { ContenedorLeido } from '../../../entities/transporte/embarque'
import {
  PANEL_AGREGAR_VEHICULOS,
  PANEL_EDITAR_CONTENEDOR,
} from '../../../entities/transporte/paneles'
import {
  SIN_VEHICULOS_EN_EL_CONTENEDOR,
  SOLO_LECTURA_DE_EMBARQUES,
  textoDeLaLlegada,
  textoDeVehiculos,
  tituloDelContenedor,
  tituloDelEmbarque,
} from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { useMenuDelContenedor, type HuecoParaElMenu } from '../hooks/use-menus-de-embarques'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'
import { VehiculosDelDestino } from './vehiculos-del-destino'

type Props = {
  contenedor: ContenedorLeido
  // `logistica.transporte.editar` y `flujos.mover` en el origen del contenedor (los decide `src/app`).
  puedeEditar: boolean
  puedeMover: boolean
  huecos: readonly HuecoParaElMenu[]
}

const BOTON = 'min-h-11 md:min-h-9'

function SuEmbarque({ c, puedeEditar }: { c: ContenedorLeido; puedeEditar: boolean }) {
  const dia = useDia()
  const paneles = usePanelDeEmbarques()
  if (c.embarque === null) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <InsigniaDeEstado estado="sin_embarque" />
        {puedeEditar ? (
          <Button
            type="button"
            variant="outline"
            className={BOTON}
            onClick={() => paneles.abrir(PANEL_EDITAR_CONTENEDOR, c.id)}
          >
            Asignar a un embarque
          </Button>
        ) : null}
      </div>
    )
  }
  const llegada = textoDeLaLlegada(c.embarque, dia)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm)">
      <span className="text-(--color-ink-soft)">Va en el</span>
      <Link
        href={embarqueDeLogistica(c.embarque.id, c.origenId) as Route}
        prefetch={false}
        className="inline-flex min-h-11 items-center font-medium underline-offset-2 hover:underline md:min-h-0"
      >
        {tituloDelEmbarque(c.embarque.booking)}
      </Link>
      <InsigniaDeEstado estado={c.embarque.estado} />
      {llegada === null ? null : <span className="text-(--color-ink-soft)">{llegada}</span>}
    </p>
  )
}

// «Agregar vehículos» y «Mover el contenedor», a la vista (la tarea de oro R4: sin pasar por un menú).
function BotonesDelContenedor({
  id,
  origenId,
  editable,
  puedeMover,
}: {
  id: string
  origenId: string
  editable: boolean
  puedeMover: boolean
}) {
  const paneles = usePanelDeEmbarques()
  if (!editable && !puedeMover) return null
  return (
    <div className="flex flex-wrap gap-2">
      {editable ? (
        <Button
          type="button"
          className={BOTON}
          onClick={() => paneles.abrir(PANEL_AGREGAR_VEHICULOS, id)}
        >
          Agregar vehículos
        </Button>
      ) : null}
      {puedeMover ? (
        <Link
          href={loteDelContenedor(id, origenId) as Route}
          prefetch={false}
          className={buttonVariants({ variant: 'outline', className: BOTON })}
        >
          Mover el contenedor
        </Link>
      ) : null}
    </div>
  )
}

// Lo que dice el drawer de un contenedor: «Contenedor <n>» con su estado, tipo y sello; su embarque enlazado (o «Sin embarque» con «Asignar a un embarque»); «Agregar vehículos» y
// «Mover el contenedor» a la vista (la tarea de oro R4: sin pasar por un menú) y el resto en su «⋯»; y sus vehículos, cada uno con «Quitar».
export function CuerpoDelContenedor({ contenedor: c, puedeEditar, puedeMover, huecos }: Props) {
  const editable = puedeEditar && c.editable
  const titulo = tituloDelContenedor(c.numero)
  const acciones = useMenuDelContenedor({
    id: c.id,
    origenId: c.origenId,
    puedeEditar: editable,
    puedeMover,
    enElDrawer: true,
    huecos,
  })
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" data-contenedor={c.id}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-(length:--text-lg) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
              {titulo}
            </h3>
            {c.embarque === null ? null : <InsigniaDeEstado estado={c.estado} />}
          </div>
          <p className="flex flex-wrap gap-x-3 text-(length:--text-sm) text-(--color-ink-soft)">
            <span>{c.tipoNombre ?? c.tipo ?? 'Sin tipo'}</span>
            <span className="[overflow-wrap:anywhere]">
              {c.sello === null ? 'Sin sello' : `Sello ${c.sello}`}
            </span>
          </p>
        </div>
        {acciones.length > 0 ? (
          <div className="shrink-0">
            <MasAcciones nombre={titulo} acciones={acciones} conBorde />
          </div>
        ) : null}
      </div>
      <SuEmbarque c={c} puedeEditar={editable} />
      <BotonesDelContenedor
        id={c.id}
        origenId={c.origenId}
        editable={editable}
        puedeMover={puedeMover}
      />
      {puedeEditar ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {SOLO_LECTURA_DE_EMBARQUES}
        </p>
      )}
      <p className="text-(length:--text-sm) font-medium">
        {textoDeVehiculos({ n: c.vehiculos.length, hayMas: c.hayMas }, c.hayOcultos)}
      </p>
      <VehiculosDelDestino
        vehiculos={c.vehiculos}
        origenId={c.origenId}
        tipo="contenedor"
        puedeEditar={editable}
        vacio={SIN_VEHICULOS_EN_EL_CONTENEDOR}
        nombre={`Vehículos de ${titulo}`}
      />
      {c.hayMas ? <AvisoDeTope texto="Se muestran los primeros 200 vehículos." /> : null}
    </div>
  )
}
