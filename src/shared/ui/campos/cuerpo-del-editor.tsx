'use client'

import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { CamposDesactivados } from './campos-desactivados'
import { CasillaLibre, CasillaLlena } from './casilla'
import { Casillas } from './casillas'
import type { Envoltorios, PropsDelCuerpo } from './cuerpo'
import { FilaDeCampo } from './fila-de-campo'
import { FilaFija } from './fila-fija'
import { FilasFijas } from './filas-fijas'
import { GruposDeCampos } from './grupos-de-campos'

// En frío (sin el código del arrastre, sin permiso o mientras llega): las listas dejan pasar a sus hijos y cada fila se dibuja quieta, con el
// lugar del asa guardado.
export const FRIOS: Envoltorios = {
  Lista: ({ children }) => children,
  Fila: FilaDeCampo,
  Fijo: FilaFija,
  Casilla: CasillaLlena,
  Libre: CasillaLibre,
}

function SinCoincidencias({ consulta, alLimpiar }: { consulta: string; alLimpiar: () => void }) {
  return (
    <div className="grid justify-items-start gap-2 rounded-(--radius-card) border border-dashed border-(--color-line) p-4">
      <p className="text-(--color-ink)">Nada coincide con «{consulta.trim()}».</p>
      <Button variant="outline" className="h-[44px] md:h-8" onClick={alLimpiar}>
        Limpiar
      </Button>
    </div>
  )
}

function Vacio(props: PropsDelCuerpo) {
  const { sinCampos, consulta, grupos, fijos, desactivados } = props
  if (sinCampos && consulta.trim() === '') {
    return (
      <EstadoVacio
        titulo={props.vacioTitulo}
        descripcion={props.vacioDescripcion}
        accion={
          props.puedeGestionar ? (
            <Button onClick={props.alCrear}>Agregar un campo</Button>
          ) : undefined
        }
      />
    )
  }
  const nada = grupos.length === 0 && (fijos?.filas.length ?? 0) === 0 && desactivados.length === 0
  return nada ? <SinCoincidencias consulta={consulta} alLimpiar={props.alLimpiar} /> : null
}

// Lo que se ve debajo de la búsqueda: las casillas, el título de la región, las filas fijas, los grupos y los desactivados. El mismo cuerpo
// se dibuja quieto (`FRIOS`) o con el arrastre (`arrastre/`): cambian sólo los envoltorios.
export function CuerpoDelEditor({
  envoltorios = FRIOS,
  ...props
}: PropsDelCuerpo & { envoltorios?: Envoltorios }) {
  const { casillas, fijos, desactivados, puedeGestionar, conAsa } = props
  return (
    <>
      {casillas ? (
        <Casillas
          casillas={casillas}
          puedeGestionar={puedeGestionar}
          envoltorios={envoltorios}
          alElegir={props.alElegirCasilla}
        />
      ) : null}
      <h2 id={props.tituloId} className="sr-only">
        {props.titulo}
      </h2>
      {fijos && casillas ? (
        <FilasFijas
          fijos={fijos}
          casillas={casillas}
          puedeGestionar={puedeGestionar}
          motivoSinPermiso={props.motivoSinPermiso}
          conAsa={conAsa}
          alAlternarFijo={props.alAlternarFijo}
          envoltorios={envoltorios}
        />
      ) : null}
      <Vacio {...props} />
      {props.grupos.length > 0 ? (
        <GruposDeCampos
          grupos={props.grupos}
          todos={props.todos}
          insignias={props.insignias}
          llaves={props.llaves}
          casillas={casillas}
          puedeGestionar={puedeGestionar}
          conAsa={conAsa}
          alElegir={props.alElegir}
          envoltorios={envoltorios}
        />
      ) : null}
      {desactivados.length > 0 ? (
        <CamposDesactivados
          campos={desactivados}
          insignias={props.insignias}
          puedeGestionar={puedeGestionar}
          alElegir={props.alElegir}
        />
      ) : null}
    </>
  )
}
