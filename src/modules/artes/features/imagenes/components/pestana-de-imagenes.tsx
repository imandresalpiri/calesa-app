'use client'

import { UploadIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_SUBIR_IMAGEN } from '../../../entities/paneles'
import type { QuienMira } from '../../../entities/permisos-de-artes'
import type { ImagenDeArte, PaginaDeArtes } from '../../../entities/tipos'
import { PieDeArtes } from '../../plantillas/components/pie-de-artes'
import { useAccionesDeLasImagenes } from '../hooks/use-acciones-de-las-imagenes'
import { useImagenes } from '../hooks/use-imagenes'
import {
  ConfirmarQuitarImagenDiferido,
  ModalRenombrarImagenDiferido,
  ModalSubirImagenDiferido,
} from './diferidos'
import { TarjetaDeImagen } from './tarjeta-de-imagen'

type Props = { inicial: PaginaDeArtes<ImagenDeArte>; quien: QuienMira }

const TOPE = `${textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} Quita las que ya no uses para ver las más viejas.`

// La pestaña Imágenes de `/artes` (`?pestana=imagenes`): la biblioteca (las de la empresa y las personales de quien mira) en la misma rejilla
// que las plantillas, con «Ver más», «Subir imagen» arriba y lo que se abre encima por URL (subir, renombrar, quitar).
export function PestanaDeImagenes({ inicial, quien }: Props) {
  const imagenes = useImagenes({ inicial })
  const acciones = useAccionesDeLasImagenes({ quien, imagenes })
  const subir = usePanelPorUrl(PANEL_SUBIR_IMAGEN)
  const { renombrar, quitar } = acciones
  const montarQuitar = useAbiertoAlgunaVez(quitar.abierto)
  const abrirSubir = () => {
    subir.abrir()
  }
  const botonDeSubir = (
    <Button type="button" className="min-h-11 md:min-h-9" onClick={abrirSubir}>
      <UploadIcon aria-hidden />
      Subir imagen
    </Button>
  )
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 basis-60 text-(length:--text-sm) text-(--color-ink-soft)">
          Las de la empresa las usa todo el equipo; las personales, sólo tú.
        </p>
        {botonDeSubir}
      </div>
      {imagenes.filas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay imágenes en tu biblioteca."
          descripcion="Sube logos, fondos y fotos para usarlos en las plantillas de arte."
          accion={botonDeSubir}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <ul
            aria-label="Imágenes de la biblioteca"
            className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3"
          >
            {imagenes.filas.map((imagen) => (
              <TarjetaDeImagen key={imagen.id} imagen={imagen} menu={acciones.menuDe(imagen)} />
            ))}
          </ul>
          <PieDeArtes carga={imagenes} tope={TOPE} />
        </div>
      )}
      {subir.abierto ? (
        <ModalSubirImagenDiferido gestiona={quien.gestiona} alCerrar={subir.cerrar} />
      ) : null}
      {renombrar.abierto && renombrar.fila ? (
        <ModalRenombrarImagenDiferido
          key={renombrar.apertura}
          imagen={renombrar.fila}
          alCerrar={renombrar.cerrar}
        />
      ) : null}
      {montarQuitar ? (
        <ConfirmarQuitarImagenDiferido
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          imagen={quitar.fila}
          apertura={quitar.apertura}
        />
      ) : null}
    </div>
  )
}
