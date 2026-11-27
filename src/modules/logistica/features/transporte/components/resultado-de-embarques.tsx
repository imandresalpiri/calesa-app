'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type {
  PaginaDeContenedores,
  PaginaDeEmbarques,
} from '../../../entities/transporte/lista-de-embarques'
import { textoDeLaCortada } from '../../../entities/transporte/textos'
import { TablaDeContenedores } from './tabla-de-contenedores'
import { TablaDeEmbarques } from './tabla-de-embarques'
import { TarjetasDeContenedores } from './tarjetas-de-contenedores'
import { TarjetasDeEmbarques } from './tarjetas-de-embarques'
import type { PropsDeLaFila } from './tipos-de-la-lista'

export type LaPagina =
  | { vista: 'embarques'; pagina: PaginaDeEmbarques }
  | { vista: 'contenedores'; pagina: PaginaDeContenedores }

type Props = PropsDeLaFila & {
  lista: LaPagina
  origenNombre: string
  preferida: VistaDeLista
  // El contenedor abierto (`?contenedor=`) y cómo abrir otro.
  abierto: string | null
  alAbrir: (id: string) => void
  // «Nuevo embarque» del vacío de primera vez (sólo con permiso).
  accionDelVacio: ReactNode
}

// Dónde estás: sin total ni «Página N». La base sólo camina hacia adelante, así que con cursor se ofrece volver al principio.
function DondeEstas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  if (!parametros.has(CLAVE_DE_CURSOR)) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Los primeros.</p>
  }
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Siguen los anteriores.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver al principio
      </Link>
    </p>
  )
}

// «Seguir buscando»: la base miró 500 sin llenar la página y `siguiente` sigue desde ahí.
function SeguirBuscando({ siguiente }: { siguiente: string }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.set(CLAVE_DE_CURSOR, siguiente)
  return (
    <Link
      href={`${ruta}?${parametros.toString()}` as Route}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      Seguir buscando
    </Link>
  )
}

function SinFilas({
  lista,
  origenNombre,
  accionDelVacio,
}: Pick<Props, 'lista' | 'origenNombre' | 'accionDelVacio'>) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const { vista, pagina } = lista
  if (pagina.cortada && pagina.siguiente !== null) {
    return (
      <EstadoVacio
        titulo={textoDeLaCortada(vista)}
        descripcion="Ninguno de los revisados coincide con los filtros."
        accion={<SeguirBuscando siguiente={pagina.siguiente} />}
      />
    )
  }
  if (filtros.hayFiltros) {
    return (
      <EstadoSinResultados
        alLimpiar={filtros.limpiar}
        descripcion={
          vista === 'contenedores'
            ? 'Ningún contenedor con estos filtros.'
            : 'Ningún embarque con estos filtros.'
        }
      />
    )
  }
  if (hayCursor) return <EstadoPaginaSinFilas />
  return (
    <EstadoVacio
      titulo={`Todavía no hay ${vista} en ${origenNombre}.`}
      accion={vista === 'embarques' ? accionDelVacio : undefined}
    />
  )
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar»), una página que se quedó sin filas o una parte revisada sin coincidencias
// («Seguir buscando»). Una sola vista (`<UnaSolaVista>`): la tabla desde `md` (o las tarjetas, si la persona las eligió) y las tarjetas por debajo. Ningún total ni suma.
export function ResultadoDeEmbarques(props: Props) {
  const { lista, preferida, abierto, alAbrir, ...fila } = props
  if (lista.pagina.filas.length === 0) {
    return (
      <SinFilas
        lista={lista}
        origenNombre={props.origenNombre}
        accionDelVacio={props.accionDelVacio}
      />
    )
  }
  const filaDe = {
    catalogos: fila.catalogos,
    origenId: fila.origenId,
    puedeEditar: fila.puedeEditar,
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-vista={lista.vista}>
      <DondeEstas />
      {lista.vista === 'embarques' ? (
        <UnaSolaVista
          preferida={preferida}
          tabla={() => <TablaDeEmbarques {...filaDe} embarques={lista.pagina.filas} />}
          tarjetas={() => <TarjetasDeEmbarques {...filaDe} embarques={lista.pagina.filas} />}
        />
      ) : (
        <UnaSolaVista
          preferida={preferida}
          tabla={() => (
            <TablaDeContenedores
              contenedores={lista.pagina.filas}
              origenId={fila.origenId}
              alAbrir={alAbrir}
              abierto={abierto}
            />
          )}
          tarjetas={() => (
            <TarjetasDeContenedores
              contenedores={lista.pagina.filas}
              origenId={fila.origenId}
              alAbrir={alAbrir}
              abierto={abierto}
            />
          )}
        />
      )}
      {lista.pagina.cortada && lista.pagina.siguiente !== null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDeLaCortada(lista.vista)} «Siguiente» sigue buscando.
        </p>
      ) : null}
      <Paginacion siguiente={lista.pagina.siguiente} anterior={null} />
    </div>
  )
}
