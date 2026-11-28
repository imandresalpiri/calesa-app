'use client'

// «Documento» del inspector del editor de artes, sin nada elegido: el formato en sólo lectura (una plantilla de arte no cambia de formato: se
// duplica en otro) y el fondo, un color o un degradado (desde, hasta y su ángulo). Pasar de uno a otro conserva el color que había.
import type { FondoDeArte } from '../../../../entities/documento'
import { fondoDeTipo, LIMITES_DEL_INSPECTOR } from '../../../../entities/editor/inspector'
import { textoDelFormato, type ClaveDeFormato } from '../../../../entities/formatos'
import type { EditorDeArte } from '../../tipos'
import { CampoDeColor } from './campo-de-color'
import { CampoDeOpciones } from './campo-de-opciones'
import { CampoNumerico } from './campo-numerico'
import { cambiarElFondo } from './cambiar-las-capas'
import { SeccionDelInspector } from './seccion-del-inspector'

type Props = {
  editor: EditorDeArte
  formato: ClaveDeFormato
}

const TIPOS_DE_FONDO = [
  { valor: 'color', etiqueta: 'Color' },
  { valor: 'degradado', etiqueta: 'Degradado' },
] as const

export function SeccionDocumento({ editor, formato }: Props) {
  const { fondo } = editor.pagina
  const { medidas, soloLectura } = editor
  const poner = (campo: string, nuevo: FondoDeArte) => {
    cambiarElFondo(editor, campo, nuevo)
  }
  return (
    <SeccionDelInspector titulo="Documento">
      <dl className="grid gap-1">
        <dt className="text-(length:--text-xs) text-(--color-ink-soft)">Formato</dt>
        <dd className="text-(length:--text-sm) text-(--color-ink) tabular-nums">
          {textoDelFormato(formato, medidas)}
        </dd>
      </dl>
      <CampoDeOpciones
        etiqueta="Fondo"
        opciones={TIPOS_DE_FONDO}
        valor={fondo.tipo}
        deshabilitado={soloLectura}
        alCambiar={(tipo) => {
          poner('tipo', fondoDeTipo(fondo, tipo))
        }}
      />
      {fondo.tipo === 'color' ? (
        <CampoDeColor
          etiqueta="Color del fondo"
          valor={fondo.color}
          deshabilitado={soloLectura}
          alCambiar={(color) => {
            poner('color', { ...fondo, color })
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <CampoDeColor
            etiqueta="Desde"
            valor={fondo.desde}
            deshabilitado={soloLectura}
            alCambiar={(desde) => {
              poner('desde', { ...fondo, desde })
            }}
          />
          <CampoDeColor
            etiqueta="Hasta"
            valor={fondo.hasta}
            deshabilitado={soloLectura}
            alCambiar={(hasta) => {
              poner('hasta', { ...fondo, hasta })
            }}
          />
          <CampoNumerico
            etiqueta="Ángulo"
            sufijo="°"
            decimales={0}
            valor={fondo.angulo}
            limites={LIMITES_DEL_INSPECTOR.angulo}
            deshabilitado={soloLectura}
            alCambiar={(angulo) => {
              poner('angulo', { ...fondo, angulo })
            }}
          />
        </div>
      )}
    </SeccionDelInspector>
  )
}
