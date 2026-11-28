'use client'

import type Konva from 'konva'
import { useMemo } from 'react'
import { Layer } from 'react-konva'
import type { CapaDeArte, PaginaDeArte } from '../../../../entities/documento'
import type { HerramientaDelEditor } from '../../../../entities/editor/atajos'
import { estaBloqueada, estaOculta } from '../../../../entities/editor/grupos'
import type { Guia } from '../../../../entities/editor/guias'
import type { Boceto } from '../../hooks/gestos-del-lienzo'
import { NOMBRE_DE_LA_INTERFAZ } from '../../hooks/nodos-del-lienzo'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'
import type { PlumaDelLienzo } from '../../hooks/use-pluma'
import type { EditorDeArte } from '../../tipos'
import { AsasDelTrazo } from './asas-del-trazo'
import { BocetoEnElLienzo } from './boceto-en-el-lienzo'
import { ContornoDeLaCapa } from './contorno-de-la-capa'
import { GuiasEnElLienzo } from './guias-en-el-lienzo'
import { Transformador } from './transformador'
import { TrazoEnCurso } from './trazo-en-curso'

type Props = {
  editor: EditorDeArte
  stage: Konva.Stage | null
  herramienta: HerramientaDelEditor
  mano: boolean
  // El texto que se está escribiendo encima (sin Transformer).
  editando: string | null
  // La capa bajo el puntero.
  encima: string | null
  guias: readonly Guia[]
  boceto: Boceto | null
  pluma: PlumaDelLienzo
  escala: number
  colores: ColoresDelLienzo
}

// Lo elegido que el Transformer toma: visible, sin candado y sin el texto que se escribe.
function transformablesDe(
  pagina: PaginaDeArte,
  seleccion: readonly string[],
  editando: string | null,
) {
  const elegidas = new Set(seleccion)
  return pagina.capas.filter(
    (c) =>
      elegidas.has(c.id) &&
      c.id !== editando &&
      !estaOculta(pagina, c) &&
      !estaBloqueada(pagina, c),
  )
}

// La capa bajo el puntero, si no está elegida (la elegida ya tiene el Transformer).
function bajoElPunteroDe(
  { pagina, estado }: EditorDeArte,
  encima: string | null,
): CapaDeArte | null {
  if (encima === null || estado.seleccion.includes(encima)) {
    return null
  }
  return pagina.capas.find((c) => c.id === encima) ?? null
}

// Un trazo elegido solo: sus nodos se editan.
function trazoElegido(transformables: readonly CapaDeArte[]) {
  const [unica] = transformables
  return transformables.length === 1 && unica?.tipo === 'trazo' ? unica : null
}

// La capa de Konva de la interfaz (`name="interfaz"`, no sale en lo exportado): el contorno de lo que está bajo el puntero, el Transformer, las
// guías, el boceto del gesto, lo que la pluma lleva dibujado y los nodos del trazo elegido. Sólo escucha con «mover».
export function CapaDeInterfaz(props: Props) {
  const { editor, stage, herramienta, mano, editando, encima, pluma, escala, colores } = props
  const { pagina, estado, soloLectura } = editor
  const conMover = herramienta === 'mover' && !mano
  const transformables = useMemo(
    () => transformablesDe(pagina, estado.seleccion, editando),
    [pagina, estado.seleccion, editando],
  )
  const bajoElPuntero = conMover ? bajoElPunteroDe(editor, encima) : null
  const trazo = conMover && !soloLectura ? trazoElegido(transformables) : null

  return (
    <Layer name={NOMBRE_DE_LA_INTERFAZ} listening={conMover}>
      {bajoElPuntero ? (
        <ContornoDeLaCapa capa={bajoElPuntero} escala={escala} color={colores.acento} />
      ) : null}
      {herramienta === 'mover' ? (
        <Transformador editor={editor} stage={stage} capas={transformables} colores={colores} />
      ) : null}
      <GuiasEnElLienzo guias={props.guias} escala={escala} colores={colores} />
      {props.boceto ? (
        <BocetoEnElLienzo boceto={props.boceto} escala={escala} colores={colores} />
      ) : null}
      {pluma.enCurso ? (
        <TrazoEnCurso trazo={pluma.enCurso} escala={escala} colores={colores} />
      ) : null}
      {trazo ? <AsasDelTrazo capa={trazo} pluma={pluma} escala={escala} colores={colores} /> : null}
    </Layer>
  )
}
