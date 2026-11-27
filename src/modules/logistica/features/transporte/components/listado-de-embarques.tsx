'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { Button, buttonVariants } from '@/shared/ui/button'
import { FilterShell, type GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import { ConmutadorDeVista } from '@/shared/ui/lista'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../../../entities/nucleo/enlaces'
import {
  CLAVE_DE_GRUPO,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  PANEL_NUEVO_EMBARQUE,
  type VistaDeGrupos,
} from '../../../entities/transporte/paneles'
import { QUE_ES_EL_CONTENEDOR, QUE_ES_EL_EMBARQUE } from '../../../entities/transporte/textos'
import { usePanelDeEmbarques, useVueltaDeLosPaneles } from '../hooks/use-panel-de-embarques'
import { useVistaDeEmbarques } from '../hooks/use-vista-de-embarques'
import { ResultadoDeEmbarques, type LaPagina } from './resultado-de-embarques'
import type { PropsDeLaFila } from './tipos-de-la-lista'

type Props = PropsDeLaFila & {
  lista: LaPagina
  // Las vistas que usa el flujo del origen (`vistasDeTransporte`); con una sola no hay qué elegir.
  vistas: readonly VistaDeGrupos[]
  origenNombre: string
  esquema: EsquemaDeFiltros
  // La ruta de la página (la pone `src/app`).
  ruta: string
  // Tabla o tarjetas, lo que eligió la persona (`embarques.vista`).
  vistaPreferida: VistaDeLista | null
}

const NOMBRE_DE_LA_VISTA: Record<VistaDeLista, string> = { tabla: 'Tabla', tarjetas: 'Tarjetas' }

// Las vistas «Embarques» y «Contenedores» que usa el origen: enlaces (la vista es `?grupo=`, en el mismo `?origen=`) y no pestañas, así recargar y compartir llevan a la misma
// lista. Cambiar de vista no conserva filtros ni página: la búsqueda y el cursor significan otra cosa en cada una.
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

// La lista de embarques o de contenedores del origen, con la línea que dice qué es cada uno, sus filtros en la URL y «Tabla | Tarjetas» en escritorio. Un embarque se abre en su
// página; un contenedor, en su drawer (`?contenedor=`), conservando filtros y página.
export function ListadoDeEmbarques({
  lista,
  vistas,
  origenNombre,
  esquema,
  ruta,
  vistaPreferida,
  ...fila
}: Props) {
  useVueltaDeLosPaneles()
  const paneles = usePanelDeEmbarques()
  const vista = useVistaDeEmbarques(vistaPreferida)
  const enEscritorio = useAlMenos(CORTE_DE_LA_TABLA)
  const opciones: GrupoDeVistaYOpciones[] = enEscritorio
    ? [
        {
          clave: 'vista',
          titulo: 'Vista',
          contenido: <ConmutadorDeVista vista={vista.vista} alCambiar={vista.cambiar} />,
          resumen: NOMBRE_DE_LA_VISTA[vista.vista],
          sinRed: 'sigue',
        },
      ]
    : []
  const nuevo =
    fila.puedeEditar && lista.vista === 'embarques' ? (
      <Button
        className="h-11 md:h-9"
        onClick={() => {
          paneles.abrir(PANEL_NUEVO_EMBARQUE)
        }}
      >
        Nuevo embarque
      </Button>
    ) : null
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Vistas vista={lista.vista} vistas={vistas} ruta={ruta} origenId={fila.origenId} />
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {lista.vista === 'contenedores' ? QUE_ES_EL_CONTENEDOR : QUE_ES_EL_EMBARQUE}
        </p>
      </div>
      <FilterShell esquema={esquema} opciones={opciones} acciones={nuevo}>
        <ResultadoDeEmbarques
          {...fila}
          lista={lista}
          origenNombre={origenNombre}
          preferida={vista.vista}
          abierto={paneles.contenedor}
          alAbrir={paneles.abrirContenedor}
          accionDelVacio={nuevo}
        />
      </FilterShell>
    </div>
  )
}
