'use client'

// «Apariencia» del inspector del editor de artes. Con una capa: la opacidad, lo que dibuja según su tipo (relleno, borde, radio, lados; la
// variante del logo, la foto, el ajuste y si la imagen cargó) y la sombra. Con varias (o un grupo entero): la opacidad que comparten, vacía con
// «Mixto» si difiere; escribirla la pone en todas.
import type { CapasConDatos } from '../../../../entities/datos/capas-con-datos'
import { esCapaConImagen, type CapaDeArte } from '../../../../entities/documento'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'
import { LIMITES_DEL_INSPECTOR, valorComun } from '../../../../entities/editor/inspector'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { EditorDeArte } from '../../tipos'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas } from './cambiar-las-capas'
import { CamposDeLaForma } from './campos-de-la-forma'
import { CamposDeLaImagen } from './campos-de-la-imagen'
import { CamposDeLaSombra } from './campos-de-la-sombra'
import { SeccionDelInspector } from './seccion-del-inspector'

type Props = {
  editor: EditorDeArte
  capas: readonly CapaDeArte[]
  logos: readonly LogoDelEditor[]
  // Lo que el lienzo dibuja para cada capa con los datos de ahora: la imagen de la única elegida.
  conDatos: CapasConDatos
}

function fuenteDe(conDatos: CapasConDatos, id: string): FuenteDeImagen | null {
  const resuelta = conDatos.resueltas.get(id)
  return resuelta?.tipo === 'imagen' ? resuelta.fuente : null
}

const POR_CIENTO = 100

export function SeccionApariencia({ editor, capas, logos, conDatos }: Props) {
  const ids = capas.map((c) => c.id)
  const opacidad = valorComun(capas, (c) => c.opacidad)
  const [unica] = capas.length === 1 ? capas : []
  return (
    <SeccionDelInspector titulo="Apariencia">
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          etiqueta="Opacidad"
          sufijo="%"
          decimales={0}
          valor={opacidad.mixto ? null : opacidad.valor * POR_CIENTO}
          limites={LIMITES_DEL_INSPECTOR.opacidad}
          deshabilitado={editor.soloLectura}
          alCambiar={(porCiento) => {
            cambiarLasCapas(editor, ids, 'opacidad', (c) => ({
              ...c,
              opacidad: porCiento / POR_CIENTO,
            }))
          }}
        />
      </div>
      {unica ? <CamposDeLaForma editor={editor} capa={unica} /> : null}
      {unica && esCapaConImagen(unica) ? (
        <CamposDeLaImagen
          editor={editor}
          capa={unica}
          logos={logos}
          fuente={fuenteDe(conDatos, unica.id)}
        />
      ) : null}
      {unica ? <CamposDeLaSombra editor={editor} capa={unica} /> : null}
    </SeccionDelInspector>
  )
}
