'use client'

// Lo que dibuja una capa en «Apariencia» del inspector del editor de artes, según su tipo: el relleno (forma y trazo), el borde (el de la
// línea no se quita; el contorno de un texto va en «Texto»), el radio de las esquinas (rectángulo e imágenes) y los lados (polígono).
import type { CapaDeArte } from '../../../../entities/documento'
import {
  COLOR_DEL_RELLENO_NUEVO,
  LIMITES_DEL_INSPECTOR,
} from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { CampoDeColor } from './campo-de-color'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas, type CambioDeCapa } from './cambiar-las-capas'
import { CamposDelBorde } from './campos-del-borde'

type Partes = {
  relleno: boolean
  borde: 'opcional' | 'fijo' | null
  radio: boolean
  lados: boolean
}

const SIN_NADA: Partes = { relleno: false, borde: null, radio: false, lados: false }
const DEL_MARCO: Partes = { relleno: false, borde: 'opcional', radio: true, lados: false }

function partesDe(capa: CapaDeArte): Partes {
  switch (capa.tipo) {
    case 'texto':
      return SIN_NADA
    case 'forma':
      return {
        relleno: true,
        borde: 'opcional',
        radio: capa.forma === 'rectangulo',
        lados: capa.forma === 'poligono',
      }
    case 'linea':
      return { ...SIN_NADA, borde: 'fijo' }
    case 'trazo':
      return { ...SIN_NADA, relleno: true, borde: 'opcional' }
    case 'imagen':
    case 'logo':
    case 'foto':
    case 'tarjeta':
      return DEL_MARCO
  }
}

const relleno = (capa: CapaDeArte) =>
  capa.tipo === 'forma' || capa.tipo === 'trazo' ? capa.relleno : null

type Props = { editor: EditorDeArte; capa: CapaDeArte }

export function CamposDeLaForma({ editor, capa }: Props) {
  const partes = partesDe(capa)
  const apagado = editor.soloLectura
  const cambiar = (campo: string, cambio: CambioDeCapa) => {
    cambiarLasCapas(editor, [capa.id], campo, cambio)
  }
  const ponerRelleno = (color: string | null) => {
    cambiar('relleno', (c) => ('relleno' in c ? { ...c, relleno: color } : c))
  }
  return (
    <>
      {partes.relleno ? (
        <CampoDeColor
          etiqueta="Relleno"
          valor={relleno(capa)}
          deshabilitado={apagado}
          alCambiar={ponerRelleno}
          opcional={{
            alAlternar: (activo) => {
              ponerRelleno(activo ? COLOR_DEL_RELLENO_NUEVO : null)
            },
          }}
        />
      ) : null}
      {partes.borde ? (
        <CamposDelBorde
          editor={editor}
          capa={capa}
          etiqueta="Borde"
          opcional={partes.borde === 'opcional'}
        />
      ) : null}
      {partes.radio || partes.lados ? (
        <div className="grid grid-cols-2 gap-2">
          {partes.radio && 'radio' in capa ? (
            <CampoNumerico
              etiqueta="Radio"
              valor={capa.radio}
              limites={LIMITES_DEL_INSPECTOR.lado}
              deshabilitado={apagado}
              alCambiar={(radio) => {
                cambiar('radio', (c) => ('radio' in c ? { ...c, radio } : c))
              }}
            />
          ) : null}
          {partes.lados && capa.tipo === 'forma' ? (
            <CampoNumerico
              etiqueta="Lados"
              valor={capa.lados}
              decimales={0}
              limites={LIMITES_DEL_INSPECTOR.lados}
              deshabilitado={apagado}
              alCambiar={(lados) => {
                cambiar('lados', (c) =>
                  c.tipo === 'forma' && c.lados !== null ? { ...c, lados } : c,
                )
              }}
            />
          ) : null}
        </div>
      ) : null}
    </>
  )
}
