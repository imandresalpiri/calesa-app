'use client'

import { ImagesIcon, UploadIcon } from 'lucide-react'
import Link from 'next/link'
import { textoDelTope } from '@/shared/lib/conteo'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros/url'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { proporcionDe } from '../../../../entities/editor/agregar-en-el-panel'
import { CLAVE_DE_PESTANA, type PestanaDeArtes } from '../../../../entities/filtros'
import { PANEL_SUBIR_IMAGEN } from '../../../../entities/paneles'
import type { ImagenDeArte, PaginaDeArtes } from '../../../../entities/tipos'
import { useImagenes } from '../../../imagenes/hooks/use-imagenes'
import { MiniaturaDeArte } from '../../../plantillas/components/miniatura-de-arte'
import { PieDeArtes } from '../../../plantillas/components/pie-de-artes'
import { BaldosaDeAgregar } from './baldosa-de-agregar'
import type { PropsDeLaSeccion } from './seccion-de-agregar'

const TOPE = `${textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} Quita en Artes › Imágenes las que ya no uses para ver las más viejas.`

const PESTANA_DE_IMAGENES: PestanaDeArtes = 'imagenes'

// «Subir imagen» abre la pestaña Imágenes de Artes con su modal, en otra pestaña del navegador: el editor no se pierde.
const PARA_SUBIR = {
  pathname: RUTAS.artes,
  query: { [CLAVE_DE_PESTANA]: PESTANA_DE_IMAGENES, [CLAVE_DE_PANEL]: PANEL_SUBIR_IMAGEN },
}

type Props = PropsDeLaSeccion & {
  inicial: PaginaDeArtes<ImagenDeArte>
  // Al ir a subir: quien la monta vuelve a leer la biblioteca cuando la persona regresa.
  alIrASubir: () => void
}

// La biblioteca de imágenes ya leída: las de la empresa y las propias de quien mira, de la más reciente a la más vieja, en baldosas que las
// agregan con su proporción. «Ver más» hasta el tope, y el camino para subir otra.
export function BibliotecaCargada({ inicial, motivo, alAgregar, alIrASubir }: Props) {
  const imagenes = useImagenes({ inicial })
  const subir = (
    <Link
      href={PARA_SUBIR}
      target="_blank"
      onClick={alIrASubir}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      <UploadIcon aria-hidden />
      Subir imagen
    </Link>
  )
  if (imagenes.filas.length === 0) {
    return (
      <EstadoVacio
        compacto
        Icono={ImagesIcon}
        titulo="Todavía no hay imágenes en tu biblioteca."
        descripcion="Se suben en otra pestaña; al volver, aparecen acá."
        accion={subir}
      />
    )
  }
  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        {imagenes.filas.map((imagen) => (
          <BaldosaDeAgregar
            key={imagen.id}
            etiqueta={imagen.nombre}
            motivo={motivo}
            alHacer={() => {
              alAgregar({ tipo: 'imagen', imagenId: imagen.id, proporcion: proporcionDe(imagen) })
            }}
          >
            <MiniaturaDeArte
              url={imagen.miniaturaUrl}
              ancho={imagen.ancho}
              alto={imagen.alto}
              damero
            />
          </BaldosaDeAgregar>
        ))}
      </ul>
      <PieDeArtes carga={imagenes} tope={TOPE} />
      <div className="flex">{subir}</div>
    </>
  )
}
