'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { MasAcciones } from '@/shared/ui/lista'
import type { EmbarqueLeido } from '../../../entities/transporte/embarque'
import { nombreDeCatalogo, textoDeLaRuta } from '../../../entities/transporte/opciones-del-embarque'
import { CLAVE_DE_FALTA, VALOR_DE_FALTA } from '../../../entities/transporte/paneles'
import {
  CONTENEDORES,
  QUE_ES_EL_EMBARQUE,
  SOLO_LECTURA_DE_EMBARQUES,
  textoDeConteo,
  textoDeLaLlegada,
  textoDelZarpe,
  textoDeVehiculos,
  tituloDelEmbarque,
} from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { useMenuDelEmbarque, type HuecoParaElMenu } from '../hooks/use-menus-de-embarques'
import { Valor } from './celdas-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'

type Props = {
  embarque: EmbarqueLeido
  catalogos: CatalogosParaNombrar
  puedeEditar: boolean
  huecos: readonly HuecoParaElMenu[]
  falta: boolean
}

const SIN_EDITAR_SUS_VEHICULOS = 'Sólo lectura: lleva vehículos cuyo transporte no puedes cambiar.'

function Dato({ etiqueta, texto }: { etiqueta: string; texto: string | null }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-sm) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere] text-(--color-ink)">
        <Valor texto={texto} />
      </dd>
    </div>
  )
}

// La cabecera de la página de un embarque: «Embarque <booking>» (h1) con su estado y su «⋯», qué es, sus datos (naviera, ruta, zarpe, llegada), cuántos vehículos y contenedores
// lleva (con tope, nunca un total), el filtro «Sólo los que tienen algo que falta» y, sin permiso, por qué es sólo lectura.
export function CabeceraDelEmbarque({ embarque: e, catalogos, puedeEditar, huecos, falta }: Props) {
  const dia = useDia()
  const editable = puedeEditar && e.editable
  const acciones = useMenuDelEmbarque(editable, huecos)
  const titulo = tituloDelEmbarque(e.booking)
  const ruta = embarqueDeLogistica(e.id, e.origenId)
  return (
    <header className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-(length:--text-xl) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
              {titulo}
            </h1>
            <InsigniaDeEstado estado={e.estado} />
          </div>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{QUE_ES_EL_EMBARQUE}</p>
        </div>
        {acciones.length > 0 ? <MasAcciones nombre={titulo} acciones={acciones} conBorde /> : null}
      </div>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
        <Dato etiqueta="Naviera" texto={nombreDeCatalogo(catalogos.navieras, e.navieraId)} />
        <Dato
          etiqueta="Ruta"
          texto={textoDeLaRuta(
            nombreDeCatalogo(catalogos.puertos, e.puertoOrigenId),
            nombreDeCatalogo(catalogos.puertos, e.puertoDestinoId),
          )}
        />
        <Dato etiqueta="Zarpe" texto={textoDelZarpe(e, dia)} />
        <Dato etiqueta="Llegada" texto={textoDeLaLlegada(e, dia)} />
      </dl>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-(length:--text-sm)">
        <span>{textoDeVehiculos(e.conteo, e.hayOcultos)}</span>
        <span>
          {textoDeConteo({ n: e.contenedores.length, hayMas: e.hayMasContenedores }, CONTENEDORES)}
        </span>
        <Link
          href={(falta ? ruta : `${ruta}&${CLAVE_DE_FALTA}=${VALOR_DE_FALTA}`) as Route}
          prefetch={false}
          aria-pressed={falta}
          className="inline-flex min-h-11 items-center rounded-(--radius-input) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-0"
        >
          {falta ? 'Ver todos los vehículos' : 'Sólo los que tienen algo que falta'}
        </Link>
      </div>
      {puedeEditar ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {SOLO_LECTURA_DE_EMBARQUES}
        </p>
      )}
      {puedeEditar && !e.editable ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {SIN_EDITAR_SUS_VEHICULOS}
        </p>
      ) : null}
      {e.hayMas ? <AvisoDeTope texto="Se muestran los primeros 200 vehículos." /> : null}
      {e.hayMasContenedores ? (
        <AvisoDeTope texto="Se muestran los primeros 100 contenedores." />
      ) : null}
    </header>
  )
}
