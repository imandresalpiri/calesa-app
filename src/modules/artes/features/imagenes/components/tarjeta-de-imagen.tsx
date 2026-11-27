'use client'

import { Badge } from '@/shared/ui/badge'
import {
  EsquinaDeAcciones,
  MasAcciones,
  TarjetaDeLista,
  type AccionDeMenu,
} from '@/shared/ui/lista'
import type { ImagenDeArte } from '../../../entities/tipos'
import { MiniaturaDeArte } from '../../plantillas/components/miniatura-de-arte'

type Props = { imagen: ImagenDeArte; menu: readonly AccionDeMenu[] }

// Una imagen de la biblioteca: la miniatura sobre un damero (se ve la transparencia), en la misma caja fija que la de una plantilla, con el
// «⋯» encima; el nombre, sus medidas y si es personal o de la empresa (texto, nunca sólo color). No abre nada: lo que se hace con ella está
// en el «⋯».
export function TarjetaDeImagen({ imagen, menu }: Props) {
  return (
    <TarjetaDeLista estirada>
      <MiniaturaDeArte url={imagen.miniaturaUrl} ancho={imagen.ancho} alto={imagen.alto} damero>
        <EsquinaDeAcciones sobreImagen>
          <MasAcciones nombre={imagen.nombre} acciones={menu} id={`imagen-${imagen.id}`} />
        </EsquinaDeAcciones>
      </MiniaturaDeArte>
      <div className="grid min-w-0 gap-1" data-imagen-de-arte={imagen.id}>
        <p className="truncate font-medium text-(--color-ink)">{imagen.nombre}</p>
        <p className="truncate text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
          {imagen.ancho} × {imagen.alto} px · {imagen.tipo.toUpperCase()}
        </p>
        <div className="flex min-h-6 items-center">
          <Badge variant={imagen.ambito === 'empresa' ? 'secondary' : 'outline'}>
            {imagen.ambito === 'empresa' ? 'De la empresa' : 'Personal'}
          </Badge>
        </div>
      </div>
    </TarjetaDeLista>
  )
}
