'use client'

import type Konva from 'konva'
import { useCallback, useState } from 'react'
import type { PropsDelLienzo } from '../tipos'
import { useArrastreDeCapas } from './use-arrastre-de-capas'
import { useColoresDelLienzo } from './use-colores-del-lienzo'
import { useExportar } from './use-exportar'
import { useFuentesListas } from './use-fuentes-listas'
import { useImagenesListas } from './use-imagenes-listas'
import { useManejoDelLienzo } from './use-manejo-del-lienzo'
import { usePluma } from './use-pluma'
import { usePunteroDelLienzo } from './use-puntero-del-lienzo'
import { useRuedaDelLienzo } from './use-rueda-del-lienzo'
import { useTextoEnElLienzo } from './use-texto-en-el-lienzo'

// Lo que arma el lienzo con sus props: el Stage, las fuentes, el texto que se escribe, la pluma, el arrastre de capas, el puntero, la rueda,
// exportar y lo que el editor le pide (`ManejoDelLienzo`).
export function useLienzo(props: PropsDelLienzo) {
  const { ref, editor, conDatos, herramienta, alUsarHerramienta, camara } = props
  const [stage, setStage] = useState<Konva.Stage | null>(null)
  // El área (en estado: exportar mira si el foco está adentro).
  const [area, setArea] = useState<HTMLDivElement | null>(null)
  const { pagina, medidas, despachar } = editor
  const escala = camara.camara.escala
  const mano = props.manoTransitoria || herramienta === 'mano'
  const fuentes = useFuentesListas(pagina)
  const imagenesListas = useImagenesListas(pagina, conDatos)
  const texto = useTextoEnElLienzo(editor)
  const pluma = usePluma({ editor, herramienta, escala, alUsarHerramienta })
  const arrastre = useArrastreDeCapas({ editor, stage, escala })
  const empezarTexto = texto.empezar
  const puntero = usePunteroDelLienzo({
    ...{ editor, camara, alUsarHerramienta, empezarTexto },
    ...{ herramienta, mano, stage, pluma },
  })
  const colores = useColoresDelLienzo()
  useRuedaDelLienzo(stage, camara)

  const alMedirTexto = useCallback(
    (id: string, alto: number) => {
      despachar({ tipo: 'medirTexto', id, alto })
    },
    [despachar],
  )

  // Lo que se está escribiendo entra al documento al salir del campo: antes de guardar y antes de exportar (que espera además las fuentes y
  // las imágenes).
  const escribiendo = texto.capa !== null
  const terminarElTexto = useCallback(() => {
    const activo = document.activeElement
    if (!escribiendo || !(activo instanceof HTMLElement) || !area?.contains(activo)) {
      return false
    }
    activo.blur()
    return true
  }, [area, escribiendo])
  const { esperar: esperarLasFuentes } = fuentes
  const esperar = useCallback(async () => {
    terminarElTexto()
    await esperarLasFuentes()
    return imagenesListas()
  }, [terminarElTexto, esperarLasFuentes, imagenesListas])
  const imagen = useExportar({ stage, medidas, esperar })
  useManejoDelLienzo({ ref, editor, pluma, escribiendo, empezarTexto, terminarElTexto, imagen })

  return {
    stage,
    setStage,
    setArea,
    mano,
    escala,
    fuentes,
    texto,
    pluma,
    arrastre,
    puntero,
    colores,
    alMedirTexto,
  }
}
