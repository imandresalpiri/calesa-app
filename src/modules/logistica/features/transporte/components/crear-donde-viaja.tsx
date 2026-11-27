'use client'

import { useEffect, useState } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  leerTiposDeContenedorParaElegir,
  type TipoParaElegir,
} from '../../../areas/transporte/composicion.client'
import type { TipoDeDestino } from '../../../entities/transporte/donde-viaja'
import type { OpcionDeTransporte } from '../../../entities/transporte/oferta'
import { LARGO_MAXIMO_DEL_CONTENEDOR } from '../../../entities/transporte/transporte'
import type { NuevoDestino } from '../hooks/use-donde-viaja'

type Props = {
  tipo: TipoDeDestino
  valores: NuevoDestino
  escribir: (cambios: Partial<NuevoDestino>) => void
  error?: string
  // Las navieras que ofrece el flujo del origen (las del formulario del hueco).
  navieras: readonly OpcionDeTransporte[]
  apagado: boolean
}

export const ID_DEL_CODIGO_NUEVO = 'donde-viaja-codigo'

// El catálogo fijo de tipos de contenedor, leído al mostrarse «Crear» de un contenedor; si no llega, el selector queda con «Sin tipo» (el tipo es opcional).
function useTiposDeContenedor(): readonly TipoParaElegir[] {
  const [tipos, setTipos] = useState<readonly TipoParaElegir[]>([])
  useEffect(() => {
    let vigente = true
    void leerTiposDeContenedorParaElegir()
      .then((r) => {
        if (vigente && r.ok) setTipos(r.data)
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [])
  return tipos
}

function TipoDeContenedor({ valores, escribir, apagado }: Props) {
  const tipos = useTiposDeContenedor()
  return (
    <CampoSeleccion
      nombre="donde-viaja-tipo"
      etiqueta="Tipo"
      opciones={[
        { valor: '', etiqueta: 'Sin tipo' },
        ...tipos.map((t) => ({ valor: t.clave, etiqueta: t.nombre })),
      ]}
      value={valores.tipoDeContenedor}
      onChange={(e) => escribir({ tipoDeContenedor: e.target.value })}
      disabled={apagado}
    />
  )
}

/** «Crear» en el modal «Dónde viaja»: lo mínimo de uno nuevo del origen (número y tipo del contenedor, o booking y naviera del embarque); lo demás se completa en su página. */
export function CrearDondeViaja(props: Props) {
  const { tipo, valores, escribir, error, navieras, apagado } = props
  const esContenedor = tipo === 'contenedor'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo
        nombre={ID_DEL_CODIGO_NUEVO}
        etiqueta={esContenedor ? 'Número' : 'Booking'}
        autoComplete="off"
        autoCapitalize="characters"
        ayuda="Va sin espacios y en mayúsculas."
        maxLength={LARGO_MAXIMO_DEL_CONTENEDOR * 2}
        value={valores.codigo}
        onChange={(e) => escribir({ codigo: e.target.value })}
        error={error}
        disabled={apagado}
      />
      {esContenedor ? (
        <TipoDeContenedor {...props} />
      ) : (
        <CampoSeleccion
          nombre="donde-viaja-naviera"
          etiqueta="Naviera"
          opciones={[{ valor: '', etiqueta: 'Sin elegir' }, ...navieras]}
          value={valores.naviera}
          onChange={(e) => escribir({ naviera: e.target.value })}
          disabled={apagado}
        />
      )}
    </div>
  )
}
