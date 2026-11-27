'use client'

import { urlPublica } from '@/shared/lib/almacen'
import { Modal } from '@/shared/ui/modal'
import { htmlParaLaVistaPrevia } from '../../../../entities/contenido/vista-previa'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'

export type PropsDeLaVistaPrevia = {
  abierto: boolean
  alCerrar: () => void
  valores: ValoresDeGuia
}

const ESTILO_DEL_ARTICULO =
  'mx-auto grid w-full max-w-3xl gap-4 text-(length:--text-base) text-(--color-ink) [&_a]:underline [&_blockquote]:border-s-4 [&_blockquote]:border-(--color-line) [&_blockquote]:ps-3 [&_blockquote]:text-(--color-ink-soft) [&_h2]:mt-4 [&_h2]:text-(length:--text-xl) [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-(length:--text-lg) [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-(--color-line) [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6 [&_.guia-galeria]:grid [&_.guia-galeria]:grid-cols-2 [&_.guia-galeria]:gap-2 [&_.guia-galeria_img]:aspect-square [&_.guia-galeria_img]:w-full [&_.guia-galeria_img]:object-cover [&_.guia-boton]:inline-flex [&_.guia-boton]:min-h-11 [&_.guia-boton]:w-fit [&_.guia-boton]:items-center [&_.guia-boton]:rounded-(--radius-md) [&_.guia-boton]:bg-(--color-ink) [&_.guia-boton]:px-4 [&_.guia-boton]:font-medium [&_.guia-boton]:text-(--color-paper) [&_.guia-boton]:no-underline [&_.guia-video]:rounded-(--radius-md) [&_.guia-video]:border [&_.guia-video]:border-(--color-line) [&_.guia-video]:p-4'

// La vista previa de la guía a pantalla completa (`?panel=vista-previa`): el mismo HTML que derivará la base, con el título y el resumen. Sólo dice qué
// verá el visitante en lo que el sitio dibuja igual; los bloques nuevos (galería, botón, video) los termina de dibujar el sitio.
export function VistaPreviaDeLaGuia({ abierto, alCerrar, valores }: PropsDeLaVistaPrevia) {
  const vista = htmlParaLaVistaPrevia(valores.cuerpo, (ruta) => urlPublica('web', ruta))
  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Vista previa" ancho="completa">
      <article className={ESTILO_DEL_ARTICULO}>
        <h1 className="text-(length:--text-2xl) font-semibold break-words">
          {valores.titulo || 'Sin título'}
        </h1>
        {valores.resumen ? <p className="text-(--color-ink-soft)">{valores.resumen}</p> : null}
        {vista.ok ? (
          vista.html === '' ? (
            <p className="text-(--color-ink-soft)">Todavía no hay nada que mostrar.</p>
          ) : (
            <div
              className="grid gap-4"
              // El HTML sale de la lista blanca del sitio (`htmlDelDocumento`): todo texto escapado, sin atributos libres.
              dangerouslySetInnerHTML={{ __html: vista.html }}
            />
          )
        ) : (
          <p role="alert" className="text-(--color-peligro-ink)">
            {vista.motivo}
          </p>
        )}
      </article>
    </Modal>
  )
}
