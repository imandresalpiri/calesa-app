'use client'

import { useDeferredValue, useEffect, useId, useMemo, useRef, type Ref } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import { FOTO_DE_LA_MINIATURA } from '../../../../entities/editor/fuente-de-la-capa'
import { cajaDeLaMiniatura } from '../../../../entities/editor/paginas'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { FuentesDelLienzo } from '../../hooks/use-fuentes-listas'
import { usePaginas } from '../../hooks/use-paginas'
import type { DatosEnElEditor, EditorDeArte, ManejoDeLaMiniatura } from '../../tipos'
import { MiniaturaDeLaPagina } from '../lienzo/miniatura-de-la-pagina'
import { BotonDeAgregarPagina } from './boton-de-agregar-pagina'
import { MiniaturaOrdenable } from './miniatura-ordenable'
import { OrdenDePaginas } from './orden-de-paginas'

type Props = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  datos: DatosEnElEditor
  fuentes: FuentesDelLienzo
  // La miniatura de la página 1 (de ahí sale la de la plantilla de arte cuando el lienzo muestra otra).
  primera: Ref<ManejoDeLaMiniatura>
}

// Cuánto se deja a cada lado de la elegida al traerla a la vista (el padding de la lista).
const MARGEN = 12

// La tira de páginas de un PDF, abajo en el panel izquierdo con alto fijo (9 rem): «Páginas» con su «+» y las miniaturas de costado, cada una
// con su número y su «⋯». La elegida se dibuja diferida (`useDeferredValue`: tipear en el lienzo no espera a su miniatura) y las demás sólo
// cuando cambian (`memo`). Al elegir otra (o agregarla) queda a la vista.
export function TiraDePaginas({ editor, logos, datos, fuentes, primera }: Props) {
  const tituloId = useId()
  const barra = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(barra)
  const paginas = usePaginas(editor)
  const diferida = useDeferredValue(editor.pagina)
  const { medidas, tipo, despachar } = editor
  const caja = useMemo(() => cajaDeLaMiniatura(medidas), [medidas])
  const { valores, datos: delArte, sinMoneda, catalogo } = datos
  const para = useMemo(
    () => ({ logos, datos: delArte, sinMoneda, catalogo, anchoDeLaFoto: FOTO_DE_LA_MINIATURA }),
    [logos, delArte, sinMoneda, catalogo],
  )
  const elegidaId = editor.pagina.id
  const ids = useMemo(() => editor.paginas.map((p) => p.id), [editor.paginas])

  useEffect(() => {
    const lista = barra.current
    const elegida = lista?.querySelector<HTMLElement>(`[data-pagina="${CSS.escape(elegidaId)}"]`)
    if (!lista || !elegida) {
      return
    }
    const desde = elegida.offsetLeft - MARGEN
    const hasta = elegida.offsetLeft + elegida.offsetWidth + MARGEN
    if (desde < lista.scrollLeft) {
      lista.scrollLeft = desde
    } else if (hasta > lista.scrollLeft + lista.clientWidth) {
      lista.scrollLeft = hasta - lista.clientWidth
    }
  }, [elegidaId, ids])

  return (
    <section
      aria-labelledby={tituloId}
      className="flex h-36 shrink-0 flex-col border-t border-(--color-line)"
    >
      <div className="flex h-8 shrink-0 items-center justify-between pr-2 pl-3">
        <h3 id={tituloId} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          Páginas
        </h3>
        <BotonDeAgregarPagina motivo={paginas.motivoParaAgregar} alAgregar={paginas.agregar} />
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={barra} className="relative h-full overflow-x-auto overflow-y-hidden">
          <OrdenDePaginas ids={ids} soloLectura={editor.soloLectura} alMover={paginas.mover}>
            {editor.paginas.map((pagina, i) => {
              const elegida = pagina.id === elegidaId
              return (
                <MiniaturaOrdenable
                  key={pagina.id}
                  id={pagina.id}
                  indice={i}
                  elegida={elegida}
                  quieta={editor.soloLectura}
                  caja={caja}
                  paginas={paginas}
                >
                  <MiniaturaDeLaPagina
                    ref={i === 0 ? primera : undefined}
                    pagina={elegida && diferida.id === pagina.id ? diferida : pagina}
                    medidas={medidas}
                    tipo={tipo}
                    valores={valores}
                    para={para}
                    fuentes={fuentes}
                    caja={caja}
                    mide={!elegida}
                    despachar={despachar}
                  />
                </MiniaturaOrdenable>
              )
            })}
          </OrdenDePaginas>
        </div>
        <PistaDeDesborde {...desborde} />
      </div>
    </section>
  )
}
