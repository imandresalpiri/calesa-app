'use client'

import { MasAcciones } from '@/shared/ui/lista/mas-acciones'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import {
  lineasDeLaPagina,
  type ClaveDelMenuDeLaPagina,
} from '../../../../entities/editor/menu-de-la-pagina'
import type { MotivosDeLaPagina } from '../../../../entities/editor/paginas'

type Props = {
  nombre: string
  motivos: MotivosDeLaPagina
  hacer: Readonly<Record<ClaveDelMenuDeLaPagina, () => void>>
}

// El «⋯» de una página de la tira: Duplicar, Mover antes, Mover después y Quitar (`lineasDeLaPagina()`), lo que no se puede apagado y con su
// motivo en una nota. Mide 24 px: va en la esquina de la miniatura.
export function MenuDeLaPagina({ nombre, motivos, hacer }: Props) {
  const acciones: AccionDeMenu[] = lineasDeLaPagina(motivos).map((linea) =>
    linea.tipo === 'accion'
      ? {
          tipo: 'accion',
          clave: linea.clave,
          etiqueta: linea.etiqueta,
          deshabilitada: linea.deshabilitada,
          destructiva: linea.destructiva ?? false,
          alElegir: hacer[linea.clave],
        }
      : linea,
  )
  return (
    <span className="absolute top-0.5 right-0.5 rounded-(--radius-md) bg-(--color-surface)/90 shadow-(--shadow-sm) [--tamano-del-mas:1.5rem]">
      <MasAcciones nombre={nombre} acciones={acciones} />
    </span>
  )
}
