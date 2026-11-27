'use client'

import { rutaDeLaPlantillaDeArte } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import {
  EnlaceDeLaFila,
  EsquinaDeAcciones,
  MasAcciones,
  TarjetaDeLista,
  type AccionDeMenu,
} from '@/shared/ui/lista'
import { nombreDelTipo, textoDelFormato, tipoDelFormato } from '../../../entities/formatos'
import type { PlantillaDeArte } from '../../../entities/tipos'
import { MiniaturaDeArte } from './miniatura-de-arte'

type Props = {
  plantilla: PlantillaDeArte
  origenNombre: string
  esPorDefecto: boolean
  yo: string
  menu: readonly AccionDeMenu[]
}

// Una plantilla de arte en la rejilla: la miniatura arriba (caja fija) con el «⋯» encima, y debajo el nombre (enlace a `/artes/<id>`), el
// formato con sus medidas y el origen, «Privada» o «De la empresa» (texto, nunca sólo color), «Por defecto para imagen|PDF» si es la de quien
// mira, y quién la creó. Cada renglón tiene su alto (`truncate`, `min-h`): todas las tarjetas miden lo mismo.
export function TarjetaDePlantilla({ plantilla, origenNombre, esPorDefecto, yo, menu }: Props) {
  const ruta = rutaDeLaPlantillaDeArte(plantilla.id)
  const autor = plantilla.autorId === yo ? 'Tuya' : `De ${plantilla.autorNombre ?? 'otra persona'}`
  return (
    <TarjetaDeLista href={ruta} estirada>
      <MiniaturaDeArte url={plantilla.miniaturaUrl} ancho={plantilla.ancho} alto={plantilla.alto}>
        <EsquinaDeAcciones sobreImagen>
          <MasAcciones nombre={plantilla.nombre} acciones={menu} id={`plantilla-${plantilla.id}`} />
        </EsquinaDeAcciones>
      </MiniaturaDeArte>
      <div className="grid min-w-0 gap-1" data-plantilla-de-arte={plantilla.id}>
        <EnlaceDeLaFila
          href={ruta}
          nombre={plantilla.nombre}
          className="truncate font-medium text-(--color-ink)"
        >
          {plantilla.nombre}
        </EnlaceDeLaFila>
        <p className="truncate text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
          {textoDelFormato(plantilla.formato, plantilla)} · {origenNombre}
        </p>
        <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant={plantilla.visibilidad === 'empresa' ? 'secondary' : 'outline'}>
            {plantilla.visibilidad === 'empresa' ? 'De la empresa' : 'Privada'}
          </Badge>
          {esPorDefecto ? (
            <Badge variant="secondary">
              Por defecto para {nombreDelTipo(tipoDelFormato(plantilla.formato))}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-(length:--text-xs) text-(--color-ink-soft)">{autor}</p>
      </div>
    </TarjetaDeLista>
  )
}
