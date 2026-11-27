'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/shared/ui/badge'
import { AsaDeArrastre } from '@/shared/ui/campos/arrastre/asa'
import { EsquinaDeAcciones, MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { esFija, type VarianteDelLogo } from '../../../entities/logos'
import { MiniaturaDeLogo } from './miniatura-de-logo'

type PropsDeLaFila = {
  logo: VarianteDelLogo
  prefijo: string
  acciones: readonly AccionDeMenu[]
}

const CLASES =
  'flex min-w-0 items-center gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) py-1 pr-1 pl-1'

function Dato({ logo }: { logo: VarianteDelLogo }) {
  const fija = esFija(logo)
  return (
    <div className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)">
          {logo.nombre}
        </span>
        {fija ? <Badge variant="secondary">Se cambia en Identidad</Badge> : null}
      </span>
      <span className="text-(length:--text-sm) text-(--color-ink-faint)">
        {logo.ruta === null
          ? 'Todavía no hay un archivo.'
          : logo.ancho !== null && logo.alto !== null
            ? `${logo.tipo?.toUpperCase() ?? ''} · ${String(logo.ancho)} × ${String(logo.alto)} px`
            : (logo.tipo?.toUpperCase() ?? '')}
      </span>
    </div>
  )
}

// Una de las dos fijas («Principal», «Para fondo oscuro»): sólo se ven; se cambian en Identidad (su «⋯» lo dice).
export function FilaFijaDeLogo({ logo, prefijo, acciones }: PropsDeLaFila) {
  return (
    <li className={CLASES} data-logo={logo.id}>
      <span aria-hidden className="w-11 shrink-0" />
      <MiniaturaDeLogo variante={logo} />
      <Dato logo={logo} />
      <EsquinaDeAcciones>
        <MasAcciones nombre={logo.nombre} acciones={acciones} id={`${prefijo}-${logo.id}-mas`} />
      </EsquinaDeAcciones>
    </li>
  )
}

// Una variante propia: se ordena arrastrando el asa o con el teclado (Espacio la toma, las flechas la mueven, Espacio la suelta) y desde el «⋯»
// («Mover antes» · «Mover después», sin arrastrar). Sin animar con `prefers-reduced-motion`: dnd-kit ya respeta `transition: null`.
export function FilaDeLogo({
  logo,
  prefijo,
  acciones,
  ocupado,
}: PropsDeLaFila & { ocupado: boolean }) {
  const ordenable = useSortable({
    id: logo.id,
    disabled: ocupado,
    attributes: { roleDescription: 'logo que se ordena' },
  })
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = ordenable
  return (
    <li
      ref={setNodeRef}
      data-logo={logo.id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 20 } : {}),
      }}
      className={CLASES}
    >
      <AsaDeArrastre
        etiqueta={`Mover «${logo.nombre}»`}
        asa={{ alMontar: setActivatorNodeRef, atributos: attributes, oyentes: listeners }}
      />
      <MiniaturaDeLogo variante={logo} />
      <Dato logo={logo} />
      <EsquinaDeAcciones>
        <MasAcciones nombre={logo.nombre} acciones={acciones} id={`${prefijo}-${logo.id}-mas`} />
      </EsquinaDeAcciones>
    </li>
  )
}
