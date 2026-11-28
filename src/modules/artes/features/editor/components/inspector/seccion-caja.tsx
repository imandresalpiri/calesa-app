'use client'

// «Posición y tamaño» de una capa en el inspector del editor de artes: X e Y (la esquina de la caja sin rotar), ancho, alto y rotación (en
// grados, alrededor del centro). El ancho y el alto cambian la caja desde su esquina; el de un texto reparte los renglones y nunca cambia el
// tamaño de la letra, y su alto lo mide el lienzo. Bloqueada, se ve y no se cambia.
import type { CapaDeArte } from '../../../../entities/documento'
import {
  conMedidas,
  LIMITES_DEL_INSPECTOR,
  normalizarGrados,
} from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas, type CambioDeCapa } from './cambiar-las-capas'
import { SeccionDelInspector } from './seccion-del-inspector'

type Props = {
  editor: EditorDeArte
  capa: CapaDeArte
  bloqueada: boolean
}

const { coordenada, lado } = LIMITES_DEL_INSPECTOR

function detalleDe(capa: CapaDeArte, bloqueada: boolean): string | null {
  if (bloqueada) {
    return 'Bloqueada'
  }
  return capa.tipo === 'texto' ? 'El alto sigue al texto' : null
}

export function SeccionCaja({ editor, capa, bloqueada }: Props) {
  const apagado = editor.soloLectura || bloqueada
  const cambiar = (campo: string, cambio: CambioDeCapa) => {
    cambiarLasCapas(editor, [capa.id], campo, cambio)
  }
  return (
    <SeccionDelInspector titulo="Posición y tamaño" detalle={detalleDe(capa, bloqueada)}>
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          etiqueta="X"
          valor={capa.x}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(x) => {
            cambiar('x', (c) => ({ ...c, x }))
          }}
        />
        <CampoNumerico
          etiqueta="Y"
          valor={capa.y}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(y) => {
            cambiar('y', (c) => ({ ...c, y }))
          }}
        />
        <CampoNumerico
          etiqueta="Ancho"
          valor={capa.ancho}
          limites={lado}
          deshabilitado={apagado}
          alCambiar={(ancho) => {
            cambiar('ancho', (c) => conMedidas(c, { ancho }))
          }}
        />
        <CampoNumerico
          etiqueta="Alto"
          valor={capa.alto}
          limites={lado}
          deshabilitado={apagado || capa.tipo === 'texto'}
          alCambiar={(alto) => {
            cambiar('alto', (c) => conMedidas(c, { alto }))
          }}
        />
        <CampoNumerico
          etiqueta="Rotación"
          sufijo="°"
          valor={capa.rotacion}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(grados) => {
            cambiar('rotacion', (c) => ({ ...c, rotacion: normalizarGrados(grados) }))
          }}
        />
      </div>
    </SeccionDelInspector>
  )
}
