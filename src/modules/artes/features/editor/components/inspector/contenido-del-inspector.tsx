'use client'

// Lo que muestra el inspector del editor de artes según lo elegido: sin nada, el documento; una capa, alinear (con el documento), posición y
// tamaño, «Texto» si es un texto, y apariencia; un grupo entero, lo mismo con la caja del grupo; varias, alinear y distribuir y la opacidad
// que comparten.
import { loElegido, unidadesQueSeMueven } from '../../../../entities/editor/inspector'
import type { DatosEnElEditor, EditorDeArte } from '../../tipos'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { ClaveDeFormato } from '../../../../entities/formatos'
import { SeccionAlinear } from './seccion-alinear'
import { SeccionApariencia } from './seccion-apariencia'
import { SeccionCaja } from './seccion-caja'
import { SeccionCajaDelGrupo } from './seccion-caja-del-grupo'
import { SeccionDocumento } from './seccion-documento'
import { SeccionTexto } from './seccion-texto'

type Props = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  datos: DatosEnElEditor
  formato: ClaveDeFormato
}

export function ContenidoDelInspector({ editor, logos, datos, formato }: Props) {
  const { conDatos } = datos
  const { pagina, estado } = editor
  const elegido = loElegido(pagina, estado.seleccion)
  const unidades = unidadesQueSeMueven(pagina, estado.seleccion)
  switch (elegido.tipo) {
    case 'nada':
      return <SeccionDocumento editor={editor} formato={formato} />
    case 'capa': {
      const { capa, bloqueada } = elegido
      return (
        <>
          <SeccionAlinear editor={editor} unidades={unidades} />
          <SeccionCaja editor={editor} capa={capa} bloqueada={bloqueada} />
          {capa.tipo === 'texto' ? (
            <SeccionTexto editor={editor} capa={capa} datos={datos} />
          ) : null}
          <SeccionApariencia editor={editor} capas={[capa]} logos={logos} conDatos={conDatos} />
        </>
      )
    }
    case 'grupo':
      return (
        <>
          <SeccionAlinear editor={editor} unidades={unidades} />
          <SeccionCajaDelGrupo
            editor={editor}
            ids={elegido.capas.map((c) => c.id)}
            caja={elegido.caja}
            bloqueada={elegido.bloqueada}
          />
          <SeccionApariencia
            editor={editor}
            capas={elegido.capas}
            logos={logos}
            conDatos={conDatos}
          />
        </>
      )
    case 'varias':
      return (
        <>
          <SeccionAlinear editor={editor} unidades={unidades} />
          <SeccionApariencia
            editor={editor}
            capas={elegido.capas}
            logos={logos}
            conDatos={conDatos}
          />
        </>
      )
  }
}
