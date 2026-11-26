'use client'

import Link from 'next/link'
import { rutaDeUnCatalogo } from '@/shared/lib/rutas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ATRIBUTO_DE_CLAVE_DE_DATO } from '../../../entities/nucleo/paneles-de-la-unidad'
import type { OpcionDeTransporte } from '../../../entities/transporte/oferta'
import {
  TEXTO_SIN_NAVIERAS,
  type CampoDeTransporte,
  type ErroresDeTransporte,
  type ValoresDeTransporte,
} from '../../../entities/transporte/transporte'

export type PropsDeCampos = {
  // Prefijo de los `id` de los campos (el panel puede estar en más de una unidad).
  prefijo: string
  valores: ValoresDeTransporte
  errores: ErroresDeTransporte
  escribir: (campo: CampoDeTransporte, valor: string) => void
  // Todo apagado: guardando, o sin permiso de editar.
  apagado: boolean
}

type PropsDeRuta = PropsDeCampos & {
  navieras: readonly OpcionDeTransporte[]
  puertosOrigen: readonly OpcionDeTransporte[]
  puertosDestino: readonly OpcionDeTransporte[]
  // El origen de la unidad si quien mira gestiona sus catálogos (ve el enlace a cargarlas); nulo, sin enlace.
  origenParaCargarNavieras: string | null
  // Sólo hay catálogo de navieras si hay alguna activa (lo que ofrece el selector, no lo guardado).
  hayNavieras: boolean
}

const SIN_ELEGIR: OpcionDeTransporte = { valor: '', etiqueta: 'Sin elegir' }

// Sin navieras activas: con un origen (quien mira gestiona sus catálogos), el enlace al drawer «Navieras» de sus fases; sin él, sólo el texto (un grupo
// cruza orígenes: cada uno carga las suyas).
export function SinNavieras({ origenId }: { origenId: string | null }) {
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)" data-estado="sin-navieras">
      {TEXTO_SIN_NAVIERAS}{' '}
      {origenId !== null ? (
        <Link
          href={rutaDeUnCatalogo(origenId, 'navieras')}
          className="font-medium text-(--color-ink) underline underline-offset-2"
        >
          Cargar navieras
        </Link>
      ) : null}
    </p>
  )
}

// «Ruta» del transporte: la naviera y los puertos de origen y destino (6.08-2). Lo que se ofrece sale del flujo; sin navieras en el catálogo, lo dice junto al selector.
export function CamposDeRuta({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
  navieras,
  puertosOrigen,
  puertosDestino,
  origenParaCargarNavieras,
  hayNavieras,
}: PropsDeRuta) {
  return (
    <>
      <div className="grid gap-1.5" {...{ [ATRIBUTO_DE_CLAVE_DE_DATO]: 'transporte.naviera' }}>
        <CampoSeleccion
          nombre={`${prefijo}-naviera`}
          etiqueta="Naviera"
          opciones={[SIN_ELEGIR, ...navieras]}
          value={valores.naviera}
          onChange={(e) => {
            escribir('naviera', e.target.value)
          }}
          error={errores.naviera}
          disabled={apagado}
        />
        {hayNavieras ? null : <SinNavieras origenId={origenParaCargarNavieras} />}
      </div>
      <CampoSeleccion
        nombre={`${prefijo}-puerto-origen`}
        etiqueta="Puerto de origen"
        opciones={[SIN_ELEGIR, ...puertosOrigen]}
        value={valores.puertoOrigen}
        onChange={(e) => {
          escribir('puertoOrigen', e.target.value)
        }}
        error={errores.puertoOrigen}
        disabled={apagado}
      />
      <CampoSeleccion
        nombre={`${prefijo}-puerto-destino`}
        etiqueta="Puerto de destino"
        opciones={[SIN_ELEGIR, ...puertosDestino]}
        value={valores.puertoDestino}
        onChange={(e) => {
          escribir('puertoDestino', e.target.value)
        }}
        error={errores.puertoDestino}
        disabled={apagado}
      />
    </>
  )
}
