'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  filaElegida,
  idDeLaFila,
  idsAlElegirLaFila,
  nombreDeLaFila,
} from '../../../../entities/editor/capas-en-la-lista'
import type { ModoDeElegir } from '../../../../entities/editor/estado'
import { estaOculta } from '../../../../entities/editor/grupos'
import { filasDeCapas } from '../../../../entities/editor/orden'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { EditorDeArte } from '../../tipos'
import { FilaDeCapa } from './fila-de-capa'
import { FilaDeGrupo } from './fila-de-grupo'
import { OrdenDeCapas } from './orden-de-capas'

type Props = { editor: EditorDeArte; logos: readonly LogoDelEditor[] }

// La lista de «Capas»: de arriba hacia abajo, lo que está más al frente; cada grupo con su fila y sus miembros debajo, sangrados
// (`filasDeCapas()`). Se ordena arrastrando (`OrdenDeCapas`). Un clic en una fila la elige (la de una capa, ella sola; la de un grupo, todos
// sus miembros), con Mayús suma y con Ctrl o ⌘ alterna; en sólo lectura se elige y nada más. Lo que se elige en el lienzo se trae a la vista.
export function ListaDeCapas({ editor, logos }: Props) {
  const { pagina, estado, despachar, soloLectura } = editor
  const lista = useRef<HTMLUListElement>(null)

  // La página de ahora, para que elegir sea un callback estable: las filas no se vuelven a dibujar en cada cambio del documento.
  const ultima = useRef(pagina)
  useLayoutEffect(() => {
    ultima.current = pagina
  })
  const alElegir = useCallback(
    (filaId: string, modo: ModoDeElegir) => {
      despachar({ tipo: 'elegir', ids: idsAlElegirLaFila(ultima.current, filaId), modo })
    },
    [despachar],
  )

  useEffect(() => {
    const primera = estado.seleccion[0]
    if (primera !== undefined) {
      lista.current
        ?.querySelector(`[data-fila-de-capas="${CSS.escape(primera)}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [estado.seleccion])

  const filas = filasDeCapas(pagina)
  if (filas.length === 0) {
    return (
      <div className="grid gap-1 px-1 py-2 text-(length:--text-sm)">
        <p className="text-(--color-ink)">Todavía no hay elementos.</p>
        <p className="text-(--color-ink-soft)">Agrégalos desde «Agregar» o con las herramientas.</p>
      </div>
    )
  }
  const seleccion = new Set(estado.seleccion)
  const nombres = new Map(filas.map((f) => [idDeLaFila(f), nombreDeLaFila(f, logos)]))
  return (
    <OrdenDeCapas
      clave={filas.map(idDeLaFila).join(' ')}
      nombres={nombres}
      soloLectura={soloLectura}
      despachar={despachar}
      refDeLaLista={lista}
    >
      {filas.map((fila) =>
        fila.tipo === 'grupo' ? (
          <FilaDeGrupo
            key={fila.grupo.id}
            grupo={fila.grupo}
            elegida={filaElegida(pagina, fila, seleccion)}
            soloLectura={soloLectura}
            despachar={despachar}
            alElegir={alElegir}
          />
        ) : (
          <FilaDeCapa
            key={fila.capa.id}
            capa={fila.capa}
            enGrupo={fila.enGrupo}
            nombre={nombres.get(fila.capa.id) ?? ''}
            elegida={seleccion.has(fila.capa.id)}
            apagada={estaOculta(pagina, fila.capa)}
            soloLectura={soloLectura}
            despachar={despachar}
            alElegir={alElegir}
          />
        ),
      )}
    </OrdenDeCapas>
  )
}
