'use client'

import { useId, type ReactNode } from 'react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { CatalogosDeLaHoja } from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AYUDA_DEL_GRUPO, EncabezadoDelGrupo } from './encabezado-del-grupo'
import { TarjetaDeItem } from './tarjeta-de-item'

type Props = {
  grupos: readonly GrupoPorPaso[]
  catalogos: CatalogosDeLaHoja
  monedaPorDefecto: string | null
  alAbrir: (id: string) => void
  accionesDe: (fila: FilaDeItem) => readonly AccionDeMenu[]
  siguienteDe: (fila: FilaDeItem) => ReactNode
}

function GrupoDeTarjetas({ grupo, ...resto }: { grupo: GrupoPorPaso } & Omit<Props, 'grupos'>) {
  const titulo = useId()
  return (
    <section
      data-grupo-de-paso={grupo.clave}
      aria-labelledby={titulo}
      className="grid min-w-0 gap-2"
    >
      <h2 id={titulo} title={AYUDA_DEL_GRUPO} className="text-(length:--text-sm) font-semibold">
        <EncabezadoDelGrupo grupo={grupo} />
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-2">
        {grupo.filas.map((fila) => (
          <TarjetaDeItem
            key={fila.id}
            fila={fila}
            catalogos={resto.catalogos}
            monedaPorDefecto={resto.monedaPorDefecto}
            acciones={resto.accionesDe(fila)}
            alAbrir={resto.alAbrir}
            siguiente={resto.siguienteDe(fila)}
          />
        ))}
      </ul>
    </section>
  )
}

// Los ítems como tarjetas en grilla, agrupados por paso (glosario: «Grupo por paso»): una `<section>` por grupo con su `h2` de texto simple («Comprar · 3», con el punto de color de la fase) y «Sin
// fase» al final. Las tarjetas miden lo que dice la grilla (`minmax(min(100%, 18rem), 1fr)`) y nunca ensanchan la página.
export function TarjetasPorPaso({ grupos, ...resto }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {grupos.map((grupo) => (
        <GrupoDeTarjetas key={grupo.clave} grupo={grupo} {...resto} />
      ))}
    </div>
  )
}
