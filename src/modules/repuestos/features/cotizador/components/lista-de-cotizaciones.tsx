'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { motivoParaElegir } from '../../../entities/cotizador/acciones-de-la-tarjeta'
import {
  TOPE_DE_COTIZACIONES,
  rutaDeLaCotizacion,
  type FilaDeCotizacion,
} from '../../../entities/cotizador/cotizacion'
import { CLAVE_DE_COTIZACION } from '../../../entities/cotizador/paneles'
import { useAceptarPorUrl, useAnularPorUrl } from '../hooks/use-confirmacion-de-cotizacion-por-url'
import { ConfirmacionesDeCotizacion } from './confirmaciones-de-cotizacion'
import { menuDeLaCotizacion } from './menu-de-la-cotizacion'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

type Props = {
  proyectoId: string
  filas: readonly FilaDeCotizacion[]
  hayMas: boolean
  // `repuestos.editar`: aceptar fija el precio de los ítems.
  puedeEditarItems: boolean
  cerrado: boolean
}

// Las cotizaciones de un proyecto (8.12-3, C11), de la más nueva. Tocar una abre su hoja; el «⋯» de su esquina ofrece lo que la entidad permite («Abrir»,
// «Aceptar», «Anular») sin leer nada al abrirse: sale de la fila y de lo que la página ya sabe de quien mira y del proyecto. Las confirmaciones están en la URL
// con la cotización elegida (`?cotizacion=`) y se montan una vez, acá. Una columna `minmax(0, 1fr)`: con el texto al 200 % nada ensancha la página.
export function ListaDeCotizaciones({
  proyectoId,
  filas,
  hayMas,
  puedeEditarItems,
  cerrado,
}: Props) {
  const router = useRouter()
  const enLinea = useEnLinea()
  const [elegida] = useQueryState(CLAVE_DE_COTIZACION, parseAsString)
  const entradaDe = (f: FilaDeCotizacion) => ({
    estado: f.estado,
    total: f.total,
    puedeEditarItems,
    cerrado,
    enLinea,
  })
  const fila = filas.find((f) => f.id === elegida) ?? null
  const aceptar = useAceptarPorUrl(motivoParaElegir('aceptar', fila && entradaDe(fila)))
  const anular = useAnularPorUrl(motivoParaElegir('anular', fila && entradaDe(fila)))
  if (filas.length === 0) {
    return <EstadoVacio titulo="Todavía no hay cotizaciones en este proyecto." compacto />
  }
  const abrir = (c: FilaDeCotizacion) => {
    router.push(rutaDeLaCotizacion(proyectoId, c.id) as Route)
  }
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Cotizaciones del proyecto">
        {filas.map((c) => (
          <TarjetaDeCotizacion
            key={c.id}
            fila={c}
            alAbrir={() => {
              abrir(c)
            }}
            acciones={menuDeLaCotizacion(entradaDe(c), (clave) => {
              if (clave === 'abrir') abrir(c)
              else if (clave === 'aceptar') aceptar.abrir(c.id)
              else anular.abrir(c.id)
            })}
          />
        ))}
      </ul>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_COTIZACIONES, {
            sustantivo: 'cotizaciones',
            articulo: 'las',
          })}
        />
      ) : null}
      <ConfirmacionesDeCotizacion
        proyectoId={proyectoId}
        cotizacion={fila}
        aceptar={aceptar}
        anular={anular}
      />
    </div>
  )
}
