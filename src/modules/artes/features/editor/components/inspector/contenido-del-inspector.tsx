'use client'

// Lo que muestra el inspector del editor de artes según lo elegido: sin nada, el documento; una capa, alinear (con el documento), posición y
// tamaño, «Texto» si es un texto, y apariencia; un grupo entero, lo mismo con la caja del grupo; varias, alinear y distribuir y la opacidad
// que comparten.
import { loElegido, unidadesQueSeMueven } from '../../../../entities/editor/inspector'
import type { PropsDelInspector } from '../../tipos'
import { SeccionAlinear } from './seccion-alinear'
import { SeccionApariencia } from './seccion-apariencia'
import { SeccionCaja } from './seccion-caja'
import { SeccionCajaDelGrupo } from './seccion-caja-del-grupo'
import { SeccionDocumento } from './seccion-documento'
import { SeccionTexto } from './seccion-texto'

export function ContenidoDelInspector({ editor, logos, formato }: PropsDelInspector) {
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
          {capa.tipo === 'texto' ? <SeccionTexto editor={editor} capa={capa} /> : null}
          <SeccionApariencia editor={editor} capas={[capa]} logos={logos} />
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
          <SeccionApariencia editor={editor} capas={elegido.capas} logos={logos} />
        </>
      )
    case 'varias':
      return (
        <>
          <SeccionAlinear editor={editor} unidades={unidades} />
          <SeccionApariencia editor={editor} capas={elegido.capas} logos={logos} />
        </>
      )
  }
}
