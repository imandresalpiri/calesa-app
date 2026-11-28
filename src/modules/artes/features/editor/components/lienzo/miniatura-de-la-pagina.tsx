'use client'

import type Konva from 'konva'
import { memo, useCallback, useImperativeHandle, useMemo, useState, type Ref } from 'react'
import { Stage } from 'react-konva'
import { capasConDatos, type ParaResolver } from '../../../../entities/datos/capas-con-datos'
import type { ValoresDelArte } from '../../../../entities/datos/valores-del-arte'
import type { PaginaDeArte } from '../../../../entities/documento'
import type { Medidas, TipoDeArte } from '../../../../entities/formatos'
import type { FuentesDelLienzo } from '../../hooks/use-fuentes-listas'
import { useExportar } from '../../hooks/use-exportar'
import { useImagenesListas } from '../../hooks/use-imagenes-listas'
import type { Despachar, ManejoDeLaMiniatura } from '../../tipos'
import { CapaDeContenido } from './capa-de-contenido'

type Props = {
  // La de la página 1: de ahí sale la miniatura de la plantilla de arte cuando el lienzo muestra otra.
  ref?: Ref<ManejoDeLaMiniatura>
  pagina: PaginaDeArte
  medidas: Medidas
  tipo: TipoDeArte
  // Los datos de la página elegida (`DatosEnElEditor`), con la foto de la miniatura (`FOTO_DE_LA_MINIATURA`).
  valores: ValoresDelArte
  para: ParaResolver
  fuentes: FuentesDelLienzo
  // La caja en px (`cajaDeLaMiniatura()`).
  caja: Medidas
  // La elegida no anota el alto de sus textos: lo anota el lienzo, que la dibuja al día.
  mide: boolean
  despachar: Despachar
}

const NO_MIDE = () => {}

// La miniatura de una página en la tira: un `Stage` chico que no escucha el puntero (lo de encima es un botón), con lo mismo que exporta el
// lienzo (`CapaDeContenido`) a la escala de su caja. En `memo`: con otra página cambiada no se vuelve a dibujar. Mide los textos de su página
// (con otro vehículo el alto cambia también en las que no se ven) y exporta como el lienzo (`useExportar`: el Stage llevado a la identidad).
export const MiniaturaDeLaPagina = memo(function MiniaturaDeLaPagina({
  ref,
  pagina,
  medidas,
  tipo,
  valores,
  para,
  fuentes,
  caja,
  mide,
  despachar,
}: Props) {
  const [stage, setStage] = useState<Konva.Stage | null>(null)
  const conDatos = useMemo(() => capasConDatos(pagina, valores, para), [pagina, valores, para])
  const escala = medidas.alto > 0 ? caja.alto / medidas.alto : 1
  const paginaId = pagina.id
  const medir = useCallback(
    (id: string, alto: number) => {
      despachar({ tipo: 'medirTexto', paginaId, id, alto })
    },
    [despachar, paginaId],
  )
  const imagenesListas = useImagenesListas(pagina, conDatos)
  const { esperar: esperarLasFuentes } = fuentes
  const esperar = useCallback(async () => {
    await esperarLasFuentes()
    return imagenesListas()
  }, [esperarLasFuentes, imagenesListas])
  const imagen = useExportar({ stage, medidas, esperar })
  useImperativeHandle(ref, () => ({ imagen }), [imagen])

  return (
    <Stage
      ref={setStage}
      width={caja.ancho}
      height={caja.alto}
      scaleX={escala}
      scaleY={escala}
      listening={false}
    >
      <CapaDeContenido
        pagina={pagina}
        medidas={medidas}
        tipo={tipo}
        conDatos={conDatos}
        escucha={false}
        soloLectura
        editando={null}
        fuentes={fuentes}
        escala={escala}
        alMedirTexto={mide ? medir : NO_MIDE}
      />
    </Stage>
  )
})
