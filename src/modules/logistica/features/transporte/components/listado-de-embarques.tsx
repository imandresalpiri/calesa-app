'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { FilterShell } from '@/shared/ui/filtros'
import type { PaginaDeGrupos } from '../../../entities/transporte/grupos'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../../../entities/nucleo/enlaces'
import {
  CLAVE_DE_GRUPO,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  type VistaDeGrupos,
} from '../../../entities/transporte/paneles'
import { useAbrirElGrupo } from '../hooks/use-abrir-el-grupo'
import { ResultadoDeEmbarques } from './resultado-de-embarques'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'

type Props = {
  pagina: PaginaDeGrupos
  vista: VistaDeGrupos
  // Las vistas que usa el flujo del origen (`vistasDeTransporte`); con una sola no hay qué elegir.
  vistas: readonly VistaDeGrupos[]
  origenId: string
  esquema: EsquemaDeFiltros
  catalogos: CatalogosParaNombrar
  // La ruta de la página (la pone `src/app`) y el `?booking=` o `?contenedor=` de la vista (dueña del drawer).
  ruta: string
  claveDelResumen: string
}

// Las vistas «Embarques» y «Contenedores» que usa el origen: enlaces (la vista es `?grupo=`, en el mismo `?origen=`) y no pestañas, así recargar y compartir llevan
// a la misma lista. Cambiar de vista no conserva filtros ni página: la búsqueda y el cursor significan otra cosa en cada tipo (D24).
function Vistas({
  vista,
  vistas,
  ruta,
  origenId,
}: {
  vista: VistaDeGrupos
  vistas: readonly VistaDeGrupos[]
  ruta: string
  origenId: string
}) {
  if (vistas.length < 2) return null
  return (
    <nav aria-label="Qué lista ver" className="flex flex-wrap gap-2">
      {vistas.map((cada) => (
        <Link
          key={cada}
          href={
            `${ruta}?${new URLSearchParams({ [CLAVE_DE_ORIGEN_DE_LOGISTICA]: origenId, [CLAVE_DE_GRUPO]: cada }).toString()}` as Route
          }
          aria-current={cada === vista ? 'page' : undefined}
          className={buttonVariants({
            variant: cada === vista ? 'secondary' : 'ghost',
            className: 'h-11 md:h-9',
          })}
        >
          {ETIQUETA_DE_VISTA_DE_GRUPOS[cada]}
        </Link>
      ))}
    </nav>
  )
}

// La lista de embarques o de contenedores con sus filtros en la URL. La fila abre el resumen del grupo (`?booking=` o `?contenedor=`) conservando filtros y página.
export function ListadoDeEmbarques({
  pagina,
  vista,
  vistas,
  origenId,
  esquema,
  catalogos,
  ruta,
  claveDelResumen,
}: Props) {
  const grupo = useAbrirElGrupo(claveDelResumen)
  return (
    <div className="grid gap-4">
      <Vistas vista={vista} vistas={vistas} ruta={ruta} origenId={origenId} />
      <FilterShell esquema={esquema}>
        <ResultadoDeEmbarques
          pagina={pagina}
          vista={vista}
          catalogos={catalogos}
          alAbrir={grupo.abrir}
          abierto={grupo.abierto}
        />
      </FilterShell>
    </div>
  )
}
