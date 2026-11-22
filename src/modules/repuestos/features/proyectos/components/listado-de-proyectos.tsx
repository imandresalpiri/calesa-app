'use client'

import type { ReactNode } from 'react'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { FilterShell, type GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import type { EstadoDelListado, PaginaDeProyectos } from '../../../entities/proyectos/listado'
import { ResultadoDeProyectos } from './resultado-de-proyectos'

type Props = {
  pagina: PaginaDeProyectos
  esquema: EsquemaDeFiltros
  estado: EstadoDelListado
  porPagina: { valor: number; opciones: readonly number[] }
  // «Nuevo proyecto» con su atajo, si la persona puede crear (`repuestos.editar`): la página decide, no este componente.
  nuevo: ReactNode
  // Lo que va en la fila de filtros antes de «Nuevo proyecto» (lo arma la página: el ⚙ «Configurar»).
  acciones?: ReactNode
  // Los grupos de «Vista y opciones» que arma la página («Qué ver»); «Ítems por página» lo suma `FilterShell`.
  opciones?: readonly GrupoDeVistaYOpciones[]
}

// `/repuestos`: los proyectos de repuestos con sus filtros en la URL (`?q=`, `?estado=`, `?por=`, `?cursor=`). La fila abre `/repuestos/<id>`.
export function ListadoDeProyectos({
  pagina,
  esquema,
  estado,
  porPagina,
  nuevo,
  acciones,
  opciones,
}: Props) {
  return (
    <FilterShell
      esquema={esquema}
      porPagina={porPagina}
      acciones={
        <>
          {acciones}
          {nuevo}
        </>
      }
      {...(opciones ? { opciones } : {})}
    >
      <ResultadoDeProyectos pagina={pagina} estado={estado} nuevo={nuevo} />
    </FilterShell>
  )
}
