'use client'

// Lo propio de la foto del vehículo en «Apariencia» del inspector del editor de artes: qué foto (la 1 es la primera: la portada y luego el
// orden de la galería), cómo llena su caja (cubrir recorta, contener deja aire) y su foco, el punto que queda a la vista al recortar: se toca
// sobre la vista previa o se escribe en por ciento. El foco sólo cuenta con «Cubrir»; con «Contener» se apaga y dice por qué (la línea ocupa
// siempre su lugar). En sólo lectura no se cambia nada.
import {
  MAXIMO_DE_FOTOS_DEL_VEHICULO,
  type CapaDe,
  type FocoDeLaFoto,
} from '../../../../entities/documento'
import { focoConPorCiento } from '../../../../entities/editor/foco'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'
import type { EditorDeArte } from '../../tipos'
import { CampoDeOpciones } from './campo-de-opciones'
import { CampoDesplegable } from './campo-desplegable'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas, type CambioDeCapa } from './cambiar-las-capas'
import { VistaDelFoco } from './vista-del-foco'

type Props = { editor: EditorDeArte; capa: CapaDe<'foto'>; fuente: FuenteDeImagen | null }

const AJUSTES = [
  { valor: 'cubrir', etiqueta: 'Cubrir' },
  { valor: 'contener', etiqueta: 'Contener' },
] as const

const FOTOS = Array.from({ length: MAXIMO_DE_FOTOS_DEL_VEHICULO }, (_, indice) => ({
  valor: String(indice),
  etiqueta: `Foto ${String(indice + 1)}`,
}))

const POR_CIENTO = { minimo: 0, maximo: 100 }

const MOTIVO_SIN_FOCO = 'El foco cuenta sólo con «Cubrir».'

export function CamposDeLaFoto({ editor, capa, fuente }: Props) {
  const apagado = editor.soloLectura
  const sinFoco = capa.ajuste !== 'cubrir'
  const cambiar = (campo: string, cambio: CambioDeCapa) => {
    cambiarLasCapas(editor, [capa.id], campo, cambio)
  }
  const ponerElFoco = (campo: string, foco: FocoDeLaFoto) => {
    cambiar(campo, (c) => (c.tipo === 'foto' ? { ...c, foco } : c))
  }
  return (
    <>
      <CampoDesplegable
        etiqueta="Foto del vehículo"
        valor={String(capa.indice)}
        opciones={FOTOS}
        deshabilitado={apagado}
        alCambiar={(valor) => {
          const indice = Number(valor)
          cambiar('foto', (c) => (c.tipo === 'foto' ? { ...c, indice } : c))
        }}
      />
      <CampoDeOpciones
        etiqueta="Ajuste"
        opciones={AJUSTES}
        valor={capa.ajuste}
        deshabilitado={apagado}
        alCambiar={(ajuste) => {
          cambiar('ajuste', (c) => (c.tipo === 'foto' ? { ...c, ajuste } : c))
        }}
      />
      <div role="group" aria-label="Foco" className="grid min-w-0 gap-1">
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">Foco</span>
        <VistaDelFoco
          foco={capa.foco}
          fuente={fuente}
          deshabilitado={apagado || sinFoco}
          alCambiar={(foco) => {
            ponerElFoco('foco', foco)
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            etiqueta="Foco X"
            sufijo="%"
            decimales={0}
            valor={capa.foco.x * 100}
            limites={POR_CIENTO}
            deshabilitado={apagado || sinFoco}
            alCambiar={(porCiento) => {
              ponerElFoco('foco-x', focoConPorCiento(capa.foco, 'x', porCiento))
            }}
          />
          <CampoNumerico
            etiqueta="Foco Y"
            sufijo="%"
            decimales={0}
            valor={capa.foco.y * 100}
            limites={POR_CIENTO}
            deshabilitado={apagado || sinFoco}
            alCambiar={(porCiento) => {
              ponerElFoco('foco-y', focoConPorCiento(capa.foco, 'y', porCiento))
            }}
          />
        </div>
        <p className="min-h-4 text-(length:--text-xs) leading-4 text-(--color-ink-faint)">
          {sinFoco ? MOTIVO_SIN_FOCO : ''}
        </p>
      </div>
    </>
  )
}
