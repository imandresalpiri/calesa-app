'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useId, useState } from 'react'
import { contenedorDeLogistica, embarqueDeLogistica } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { TransporteDeLaUnidad } from '../../../areas/transporte/composicion.client'
import { ATRIBUTO_DE_CLAVE_DE_DATO } from '../../../entities/nucleo/paneles-de-la-unidad'
import { avisoDelTransporte } from '../../../entities/transporte/aviso-del-transporte'
import { textoSinDestino } from '../../../entities/transporte/donde-viaja'
import { CLAVE_DE_DONDE_VIAJA, PANEL_DONDE_VIAJA } from '../../../entities/transporte/paneles'
import { tituloDelContenedor, tituloDelEmbarque } from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { ModalDondeViajaDiferido } from './diferidos-de-modales'
import { InsigniaDeEstado } from './insignia-de-estado'
import { LineaDelAviso } from './linea-del-aviso'
import type { OpcionesDelFormulario } from './opciones-del-formulario'

type PropsDelModal = {
  unidadId: string
  origenId: string
  datos: TransporteDeLaUnidad
  releer: () => void
}

type Props = PropsDelModal & {
  opciones: OpcionesDelFormulario
  puedeEditar: boolean
}

// Lo que «Completar» de «Qué falta» enfoca aquí (`~=`: una lista de claves). Sin destino, elegirlo cumple el contenedor y el booking; con embarque, lo suyo se completa en su página.
const CLAVES_SIN_DESTINO = 'transporte.contenedor transporte.booking'
const CLAVES_DEL_EMBARQUE = 'transporte.naviera transporte.zarpe transporte.eta transporte.arribo'
const ENLACE =
  'inline-flex min-h-11 items-center font-medium text-(--color-ink) underline underline-offset-2 md:min-h-9'

const claves = (valor: string | null) => (valor ? { [ATRIBUTO_DE_CLAVE_DE_DATO]: valor } : {})
const etiquetaDe = (
  opciones: readonly { valor: string; etiqueta: string }[],
  valor: string | null,
) => (valor === null ? null : (opciones.find((o) => o.valor === valor)?.etiqueta ?? null))

// Lo del embarque, mostrado y no repetido como campo: naviera, ruta, zarpe y la llegada estimada y real. Sólo lo que tiene valor.
function LoDelEmbarque({ datos, opciones }: Pick<Props, 'datos' | 'opciones'>) {
  const dia = useDia()
  const t = datos.transporte
  if (t === null) return null
  const origen = etiquetaDe(opciones.puertosOrigen, t.puertoOrigenId)
  const destino = etiquetaDe(opciones.puertosDestino, t.puertoDestinoId)
  const filas: [string, string | null][] = [
    ['Naviera', etiquetaDe(opciones.navieras, t.navieraId)],
    ['Ruta', origen || destino ? `${origen ?? 'Sin puerto'} → ${destino ?? 'Sin puerto'}` : null],
    ['Zarpe', t.zarpeEl === null ? null : dia(t.zarpeEl)],
    ['Llegada estimada', t.etaEl === null ? 'Sin fecha' : dia(t.etaEl)],
    ['Llegada real', t.arriboEl === null ? 'Todavía no llegó' : dia(t.arriboEl)],
  ]
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-(length:--text-sm)">
      {filas.map(([nombre, valor]) =>
        valor === null ? null : (
          <div key={nombre} className="contents">
            <dt className="text-(--color-ink-soft)">{nombre}</dt>
            <dd className="[overflow-wrap:anywhere]">{valor}</dd>
          </div>
        ),
      )}
    </dl>
  )
}

// El contenedor o el embarque en que va, con su estado (de la base) y, si va en un contenedor de un embarque, ese embarque.
function Destino({ datos }: Pick<Props, 'datos'>) {
  const { contenedorDeLaUnidad: contenedor, embarque } = datos
  const principal = contenedor
    ? { titulo: tituloDelContenedor(contenedor.numero), estado: contenedor.estado }
    : embarque
      ? { titulo: tituloDelEmbarque(embarque.booking), estado: embarque.estado }
      : null
  if (principal === null) {
    return <p className="text-(--color-ink-soft)">{textoSinDestino(datos.usaContenedores)}</p>
  }
  return (
    <div className="grid gap-0.5">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium [overflow-wrap:anywhere]">{principal.titulo}</span>
        <InsigniaDeEstado estado={principal.estado} />
      </p>
      {contenedor && embarque ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          En el embarque {embarque.booking}
        </p>
      ) : null}
    </div>
  )
}

// «Elegir o crear» (o «Cambiar») con permiso y el enlace a la página de lo que lo lleva: «Editar el embarque» (o «Ver», sin permiso) o, en un contenedor sin embarque, «Ver el contenedor».
function AccionesDelDestino({
  datos,
  origenId,
  puedeEditar,
  alElegir,
}: Pick<Props, 'datos' | 'origenId' | 'puedeEditar'> & { alElegir: () => void }) {
  const { contenedorDeLaUnidad: contenedor, embarque } = datos
  const sinDestino = contenedor === null && embarque === null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {puedeEditar ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={alElegir}
          {...claves(sinDestino ? CLAVES_SIN_DESTINO : contenedor ? null : 'transporte.contenedor')}
        >
          {sinDestino ? 'Elegir o crear' : 'Cambiar'}
        </Button>
      ) : null}
      {embarque ? (
        <Link
          href={embarqueDeLogistica(embarque.id, origenId) as Route}
          className={ENLACE}
          {...claves(CLAVES_DEL_EMBARQUE)}
        >
          {puedeEditar ? 'Editar el embarque' : 'Ver el embarque'}
        </Link>
      ) : contenedor ? (
        <Link
          href={contenedorDeLogistica(contenedor.id, origenId) as Route}
          className={ENLACE}
          {...claves('transporte.booking')}
        >
          Ver el contenedor
        </Link>
      ) : null}
    </div>
  )
}

// Cuántas veces se abrió el modal: cada vez nace de nuevo (otro intento, nada elegido de antes) y al cerrarse se anima.
function useVecesAbierto(abierto: boolean): number {
  const [antes, setAntes] = useState(abierto)
  const [veces, setVeces] = useState(0)
  if (abierto !== antes) {
    setAntes(abierto)
    if (abierto) setVeces(veces + 1)
  }
  return veces
}

/** «Dónde viaja», lo primero del hueco «Transporte»: el contenedor o el embarque con su estado y su llegada, «Elegir o crear» (o «Cambiar») y el enlace a su página. */
export function DondeViaja({
  origenId,
  datos,
  opciones,
  puedeEditar,
}: Omit<Props, 'unidadId' | 'releer'>) {
  const titulo = useId()
  const panel = usePanelPorUrl(PANEL_DONDE_VIAJA, [], { clave: CLAVE_DE_DONDE_VIAJA })
  const { embarque } = datos
  return (
    <section aria-labelledby={titulo} className="grid min-w-0 gap-2" data-donde-viaja="">
      <h3 id={titulo} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Dónde viaja
      </h3>
      <Destino datos={datos} />
      {embarque ? <LoDelEmbarque datos={datos} opciones={opciones} /> : null}
      <LineaDelAviso texto={avisoDelTransporte(datos)} />
      <AccionesDelDestino
        datos={datos}
        origenId={origenId}
        puedeEditar={puedeEditar}
        alElegir={() => panel.abrir()}
      />
    </section>
  )
}

/**
 * El modal «Elegir o crear» (`?transporte=donde-viaja`), con su código diferido: se monta al abrirse por primera vez y nace de nuevo en cada apertura. Va **fuera** del `<form>` del hueco:
 * es un portal, y su `submit` subiría por el árbol de React hasta el «Guardar» del hueco.
 */
export function ModalDeDondeViaja(props: PropsDelModal) {
  const panel = usePanelPorUrl(PANEL_DONDE_VIAJA, [], { clave: CLAVE_DE_DONDE_VIAJA })
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const veces = useVecesAbierto(panel.abierto)
  return montado ? <ModalDondeViajaDiferido key={veces} {...props} /> : null
}
