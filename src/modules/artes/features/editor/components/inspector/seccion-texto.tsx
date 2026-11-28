'use client'

// «Texto» del inspector del editor de artes: la fuente (una que ya no está se ve y se dibuja como la por defecto), el tamaño de la letra (el
// único lugar que lo cambia), el peso, el interlineado, la alineación, el color, el contorno y, abajo, el aviso de las variables.
import { TextAlignCenter, TextAlignEnd, TextAlignStart } from 'lucide-react'
import { PESOS_DE_TEXTO, type CapaDe } from '../../../../entities/documento'
import {
  FUENTES_DE_ARTE,
  fuenteDe,
  NOMBRES_DE_LOS_PESOS,
} from '../../../../entities/editor/fuentes'
import { LIMITES_DEL_INSPECTOR } from '../../../../entities/editor/inspector'
import type { DatosEnElEditor, EditorDeArte } from '../../tipos'
import { AvisoDeLasVariables } from './aviso-de-las-variables'
import { CampoDeColor } from './campo-de-color'
import { CampoDeOpciones } from './campo-de-opciones'
import { CampoDesplegable } from './campo-desplegable'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas } from './cambiar-las-capas'
import { CamposDelBorde } from './campos-del-borde'
import { SeccionDelInspector } from './seccion-del-inspector'

type Texto = CapaDe<'texto'>
type Props = { editor: EditorDeArte; capa: Texto; datos: DatosEnElEditor }

const FUENTES = FUENTES_DE_ARTE.map((f) => ({ valor: f.clave, etiqueta: f.nombre }))
const PESOS = PESOS_DE_TEXTO.map((p) => ({ valor: String(p), etiqueta: NOMBRES_DE_LOS_PESOS[p] }))
const ALINEACIONES = [
  { valor: 'izquierda', etiqueta: 'A la izquierda', icono: TextAlignStart },
  { valor: 'centro', etiqueta: 'Al centro', icono: TextAlignCenter },
  { valor: 'derecha', etiqueta: 'A la derecha', icono: TextAlignEnd },
] as const

const PASO_DEL_INTERLINEADO = 0.1

export function SeccionTexto({ editor, capa, datos }: Props) {
  const apagado = editor.soloLectura
  const cambiar = (campo: string, cambio: (texto: Texto) => Texto) => {
    cambiarLasCapas(editor, [capa.id], campo, (c) => (c.tipo === 'texto' ? cambio(c) : c))
  }
  return (
    <SeccionDelInspector titulo="Texto">
      <CampoDesplegable
        etiqueta="Fuente"
        valor={fuenteDe(capa.fuente).clave}
        opciones={FUENTES}
        deshabilitado={apagado}
        alCambiar={(fuente) => {
          cambiar('fuente', (c) => ({ ...c, fuente }))
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          etiqueta="Tamaño"
          valor={capa.tamano}
          decimales={1}
          limites={LIMITES_DEL_INSPECTOR.tamano}
          deshabilitado={apagado}
          alCambiar={(tamano) => {
            cambiar('tamano', (c) => ({ ...c, tamano }))
          }}
        />
        <CampoDesplegable
          etiqueta="Peso"
          valor={String(capa.peso)}
          opciones={PESOS}
          deshabilitado={apagado}
          alCambiar={(valor) => {
            const peso = PESOS_DE_TEXTO.find((p) => String(p) === valor)
            if (peso !== undefined) {
              cambiar('peso', (c) => ({ ...c, peso }))
            }
          }}
        />
        <CampoNumerico
          etiqueta="Interlineado"
          valor={capa.interlineado}
          paso={PASO_DEL_INTERLINEADO}
          limites={LIMITES_DEL_INSPECTOR.interlineado}
          deshabilitado={apagado}
          alCambiar={(interlineado) => {
            cambiar('interlineado', (c) => ({ ...c, interlineado }))
          }}
        />
        <CampoDeOpciones
          etiqueta="Alineación"
          opciones={ALINEACIONES}
          valor={capa.alineacion}
          deshabilitado={apagado}
          alCambiar={(alineacion) => {
            cambiar('alineacion', (c) => ({ ...c, alineacion }))
          }}
        />
      </div>
      <CampoDeColor
        etiqueta="Color"
        valor={capa.color}
        deshabilitado={apagado}
        alCambiar={(color) => {
          cambiar('color', (c) => ({ ...c, color }))
        }}
      />
      <CamposDelBorde editor={editor} capa={capa} etiqueta="Contorno" opcional />
      <AvisoDeLasVariables
        texto={capa.texto}
        catalogo={datos.catalogo}
        origen={datos.origen.nombre}
      />
    </SeccionDelInspector>
  )
}
