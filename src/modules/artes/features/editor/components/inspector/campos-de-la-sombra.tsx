'use client'

// La sombra de una capa en «Apariencia» del inspector del editor de artes: su interruptor y, siempre a la vista, el color, el desenfoque y el
// corrimiento (horizontal y vertical: «X» e «Y» son de la caja). Sin sombra, los campos quedan apagados con la que se pondría.
import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import type { CapaDeArte, SombraDeCapa } from '../../../../entities/documento'
import {
  conSombra,
  LIMITES_DEL_INSPECTOR,
  SOMBRA_NUEVA,
} from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { CampoDeColor } from './campo-de-color'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas } from './cambiar-las-capas'

type Props = { editor: EditorDeArte; capa: CapaDeArte }

const { coordenada, desenfoque } = LIMITES_DEL_INSPECTOR

export function CamposDeLaSombra({ editor, capa }: Props) {
  const idDelTitulo = useId()
  const ids = [capa.id]
  const sombra = capa.sombra ?? SOMBRA_NUEVA
  const apagado = editor.soloLectura || capa.sombra === null
  const cambiar = (parte: Partial<SombraDeCapa>) => {
    const [campo = 'sombra'] = Object.keys(parte)
    cambiarLasCapas(editor, ids, `sombra-${campo}`, (c) => conSombra(c, parte))
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <div className="flex h-5 items-center justify-between gap-2">
        <span id={idDelTitulo} className="text-(length:--text-xs) text-(--color-ink-soft)">
          Sombra
        </span>
        <Switch
          size="sm"
          checked={capa.sombra !== null}
          disabled={editor.soloLectura}
          aria-labelledby={idDelTitulo}
          onCheckedChange={(activa) => {
            cambiarLasCapas(editor, ids, 'sombra', (c) => ({
              ...c,
              sombra: activa ? SOMBRA_NUEVA : null,
            }))
          }}
        />
      </div>
      <CampoDeColor
        etiqueta="Color de la sombra"
        valor={sombra.color}
        deshabilitado={apagado}
        alCambiar={(color) => {
          cambiar({ color })
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        <CampoNumerico
          etiqueta="Desenfoque"
          valor={sombra.desenfoque}
          limites={desenfoque}
          deshabilitado={apagado}
          alCambiar={(valor) => {
            cambiar({ desenfoque: valor })
          }}
        />
        <CampoNumerico
          etiqueta="Horizontal"
          valor={sombra.x}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(x) => {
            cambiar({ x })
          }}
        />
        <CampoNumerico
          etiqueta="Vertical"
          valor={sombra.y}
          limites={coordenada}
          deshabilitado={apagado}
          alCambiar={(y) => {
            cambiar({ y })
          }}
        />
      </div>
    </div>
  )
}
