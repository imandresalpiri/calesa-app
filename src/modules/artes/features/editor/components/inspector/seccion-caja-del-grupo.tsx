'use client'

// «Posición y tamaño» de un grupo entero en el inspector del editor de artes: la caja que encierra a sus miembros. X e Y lo mueven entero
// (como arrastrarlo); el ancho y el alto se ven y se cambian con las asas del lienzo. Con algo bloqueado adentro, nada se cambia.
import type { Caja } from '../../../../entities/editor/cajas'
import { LIMITES_DEL_INSPECTOR } from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { CampoNumerico } from './campo-numerico'
import { moverLasCapas } from './cambiar-las-capas'
import { SeccionDelInspector } from './seccion-del-inspector'

type Props = {
  editor: EditorDeArte
  ids: readonly string[]
  caja: Caja
  bloqueada: boolean
}

const { coordenada, lado } = LIMITES_DEL_INSPECTOR
const sinCambio = () => undefined

export function SeccionCajaDelGrupo({ editor, ids, caja, bloqueada }: Props) {
  const apagado = editor.soloLectura || bloqueada
  return (
    <SeccionDelInspector titulo="Posición y tamaño" detalle={bloqueada ? 'Bloqueado' : 'Grupo'}>
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          etiqueta="X"
          valor={caja.x}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(x) => {
            moverLasCapas(editor, ids, x - caja.x, 0)
          }}
        />
        <CampoNumerico
          etiqueta="Y"
          valor={caja.y}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(y) => {
            moverLasCapas(editor, ids, 0, y - caja.y)
          }}
        />
        <CampoNumerico
          etiqueta="Ancho"
          valor={caja.ancho}
          limites={lado}
          deshabilitado
          alCambiar={sinCambio}
        />
        <CampoNumerico
          etiqueta="Alto"
          valor={caja.alto}
          limites={lado}
          deshabilitado
          alCambiar={sinCambio}
        />
      </div>
    </SeccionDelInspector>
  )
}
