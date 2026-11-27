'use client'

import { useCallback } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import {
  leerHistorialDeLaUnidad,
  NO_SE_LEYO_EL_HISTORIAL,
} from '../../../areas/mover/composicion.client'
import { hayFiltro, SIN_FILTRO } from '../../../entities/mover/filtro-del-historial'
import { lineaDelCambio, quienHizoElCambio } from '../../../entities/mover/historial'
import type { PedidoDeLaLista } from '../../../entities/mover/pagina-de-la-unidad'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useFiltroDelHistorial } from '../hooks/use-filtro-del-historial'
import { useListaDeLaUnidad } from '../hooks/use-lista-de-la-unidad'
import { useCadenaDeLaPagina } from './cadena/proveedor-de-la-cadena'
import { CuerpoDeLaLista } from './cuerpo-de-la-lista'
import { FiltrosDelHistorial } from './filtros-del-historial'

const SUSTANTIVO = { plural: 'cambios', articulo: 'los' } as const

// El hueco «Historial» de la unidad (6.04-2): de sólo lectura, una línea por cambio de fase con quién, cuándo y su nota. Más reciente primero, de a 20 con «Ver más» y «Ir a una
// fecha». Es una lista, no una tabla: nada se abre desde aquí. En su página (con la cadena) se filtra por la fase a la que entró y por quién lo movió (`?historial_fase=`,
// `?historial_quien=`); el filtro lo hace la base, por sus índices. En un drawer va sin filtros y la URL no cuenta.
export function HuecoDeHistorial({ unidad }: { unidad: UnidadAbierta }) {
  const { zonaHoraria } = useRegional()
  const opciones = useCadenaDeLaPagina()?.opcionesDelHistorial ?? null
  const [filtroDeLaUrl, cambiar] = useFiltroDelHistorial()
  const filtro = opciones ? filtroDeLaUrl : SIN_FILTRO
  const { fase, quien } = filtro
  const leer = useCallback(
    (pedido: PedidoDeLaLista) => leerHistorialDeLaUnidad({ ...pedido, filtro: { fase, quien } }),
    [fase, quien],
  )
  const lista = useListaDeLaUnidad(unidad, leer, NO_SE_LEYO_EL_HISTORIAL, zonaHoraria)
  const quitar = useCallback(() => {
    cambiar({ fase: null, quien: null })
  }, [cambiar])
  return (
    <div className="grid gap-3" data-hueco="historial">
      {opciones ? (
        <FiltrosDelHistorial opciones={opciones} filtro={filtro} cambiar={cambiar} />
      ) : null}
      <CuerpoDeLaLista
        lista={lista}
        zona={zonaHoraria}
        cargando="Cargando el historial"
        vacio="Todavía no hay cambios de fase."
        vacioPorFiltro={
          hayFiltro(filtro)
            ? {
                descripcion: 'Ningún cambio de fase cumple la fase o la persona elegidas.',
                alQuitar: quitar,
              }
            : null
        }
        sustantivo={SUSTANTIVO}
        fila={(cambio) => (
          <li className="grid min-w-0 gap-1 rounded-lg border border-(--color-line) p-3">
            <p className="font-medium break-words">{lineaDelCambio(cambio)}</p>
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              {quienHizoElCambio(cambio)} ·{' '}
              <time dateTime={cambio.creadoEn}>
                {formatearFechaHora(cambio.creadoEn, { zona: zonaHoraria })}
              </time>
            </p>
            {cambio.nota ? <p className="break-words whitespace-pre-wrap">{cambio.nota}</p> : null}
          </li>
        )}
      />
    </div>
  )
}
