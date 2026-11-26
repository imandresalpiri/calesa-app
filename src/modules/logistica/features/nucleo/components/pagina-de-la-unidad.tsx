import type { ReactNode } from 'react'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { zonasDeLaUnidad } from '../../../entities/nucleo/zonas'
import { CabeceraDeLaUnidad } from './cabecera-de-la-unidad'
import { seccionesDeLaUnidad } from './contenido-del-hueco'
import { DisposicionDeLaPagina } from './disposicion-de-la-pagina'

type Props = {
  unidad: UnidadAbierta
  origen: string
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`).
  huecos: readonly HuecoDeLaUnidad[]
  aviso?: string | null
  // La portada y «Relacionados» en una línea: los compone `src/app` (`logistica` no conoce `vehiculos`).
  foto?: ReactNode
  relacionados?: ReactNode
  puedeMover?: boolean
}

// La unidad en su propia página (T20): la cabecera compacta y, debajo, las zonas (escritorio) o las secciones a la vista con la barra «Mover» (celular). El alto fijo que hace que en escritorio no se desplace la
// página lo pone `src/app` con `--alto-del-detalle`; aquí sólo se usa, desde 56 rem de contenedor (con el texto al 200 % los rem crecen y la página vuelve sola a una columna con alto natural). La cabecera va
// fuera del cambio de forma: si el ancho se adivinó mal, el remonte no la toca. Compatible con servidor.
export function PaginaDeLaUnidad({
  unidad,
  origen,
  fase,
  huecos,
  aviso = null,
  foto = null,
  relacionados = null,
  puedeMover = false,
}: Props) {
  const zonas = zonasDeLaUnidad(seccionesDeLaUnidad(unidad, huecos))
  return (
    <div data-slot="panel-de-la-unidad" className="@container/unidad min-w-0">
      <div className="grid min-w-0 gap-3 @min-[56rem]/unidad:h-(--alto-del-detalle) @min-[56rem]/unidad:grid-rows-[auto_minmax(0,1fr)]">
        <CabeceraDeLaUnidad
          unidad={unidad}
          origen={origen}
          fase={fase}
          aviso={aviso}
          enLaPagina
          foto={foto}
          relacionados={relacionados}
        />
        <DisposicionDeLaPagina key={unidad.id} zonas={zonas} puedeMover={puedeMover} />
      </div>
    </div>
  )
}
