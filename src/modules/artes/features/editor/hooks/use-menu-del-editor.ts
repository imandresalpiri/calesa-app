'use client'

import { useState, type RefObject } from 'react'
import { descargarArchivo } from '@/shared/lib/compartir'
import { avisar, avisarError } from '@/shared/ui/toasts'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { nombreDelArchivo, textoDeImagenesQueFaltan } from '../../../entities/editor/exportar'
import type { ClaveDelMenuDelEditor } from '../../../entities/editor/menu-del-editor'
import type { EditorDeArte, ManejoDelLienzo } from '../tipos'

export const PANEL_DEL_OTRO_FORMATO = 'otro-formato'

const NO_SE_ARMO = 'No pudimos armar la imagen. Prueba de nuevo.'

async function exportarPng(lienzo: ManejoDelLienzo | null, nombre: string, pagina: number | null) {
  const hecho = await lienzo?.imagen({ pixelRatio: 1, tipo: 'image/png' })
  if (!hecho) {
    avisarError({ codigo: 'inesperado', mensaje: NO_SE_ARMO })
    return
  }
  descargarArchivo(hecho.blob, nombreDelArchivo(nombre, { pagina }))
  const faltan = textoDeImagenesQueFaltan(hecho.faltan)
  if (faltan !== null) {
    avisar(faltan)
  }
}

// Lo que hace cada línea del «⋯» de la barra: el PNG de la página que se ve al tamaño del formato (avisa si salió sin alguna imagen; con
// varias páginas lleva su número: «promo-pagina-2.png»), «Duplicar en otro formato» (`?panel=otro-formato`) y la lista de atajos.
export function useMenuDelEditor(
  lienzo: RefObject<ManejoDelLienzo | null>,
  nombre: string,
  { paginas, indice }: Pick<EditorDeArte, 'paginas' | 'indice'>,
) {
  const pagina = paginas.length > 1 ? indice + 1 : null
  const otroFormato = usePanelPorUrl(PANEL_DEL_OTRO_FORMATO)
  const [atajos, setAtajos] = useState(false)
  const hacer: Readonly<Record<ClaveDelMenuDelEditor, () => void>> = {
    'exportar-png': () => {
      void exportarPng(lienzo.current, nombre, pagina)
    },
    'otro-formato': () => {
      otroFormato.abrir()
    },
    atajos: () => {
      setAtajos(true)
    },
  }
  return { hacer, otroFormato, atajos, setAtajos }
}
