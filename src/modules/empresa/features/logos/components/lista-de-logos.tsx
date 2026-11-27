'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useId } from 'react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  esFija,
  propias,
  puedeMoverse,
  type ListaDeLogos,
  type VarianteDelLogo,
} from '../../../entities/logos'
import type { Logos } from '../hooks/use-logos'
import { FilaDeLogo, FilaFijaDeLogo } from './fila-de-logo'

const INSTRUCCIONES =
  'Para mover el logo, pulsa Espacio, usa las flechas y pulsa Espacio otra vez. Esc cancela. También puedes usar «Mover antes» y «Mover después» del menú.'

// Se mueven sólo de arriba abajo (sin `@dnd-kit/modifiers`).
const soloVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function anuncios(lista: ListaDeLogos): Announcements {
  const ids = propias(lista).map((v) => v.id)
  const nombre = (id: string | number) =>
    `«${lista.variantes.find((v) => v.id === String(id))?.nombre ?? ''}»`
  const lugar = (id: string | number) => String(ids.indexOf(String(id)) + 1)
  return {
    onDragStart: ({ active }) => `Tomaste ${nombre(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null
        ? undefined
        : `${nombre(active.id)} va en el lugar ${lugar(over.id)} de ${String(ids.length)}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? `Se canceló: ${nombre(active.id)} volvió a su lugar.`
        : `Soltaste ${nombre(active.id)} en el lugar ${lugar(over.id)}.`,
    onDragCancel: ({ active }) => `Se canceló: ${nombre(active.id)} volvió a su lugar.`,
  }
}

type Props = {
  logos: Logos
  prefijo: string
  alRenombrar: (id: string) => void
  alPedirQuitar: (id: string) => void
  alCambiarEnIdentidad: () => void
}

// Las líneas del «⋯» de una variante propia: Renombrar · Mover antes · Mover después · ─ · Quitar. Lo que abre algo encima espera a que el menú se cierre.
function accionesDeLogo(logo: VarianteDelLogo, logos: Logos, props: Props): AccionDeMenu[] {
  const { lista } = logos
  return [
    {
      tipo: 'accion',
      clave: 'renombrar',
      etiqueta: 'Renombrar…',
      despuesDeCerrar: true,
      alElegir: () => {
        props.alRenombrar(logo.id)
      },
    },
    {
      tipo: 'accion',
      clave: 'antes',
      etiqueta: 'Mover antes',
      deshabilitada: !puedeMoverse(lista, logo.id, 'antes') || logos.enCurso,
      alElegir: () => void logos.mover(logo, 'antes'),
    },
    {
      tipo: 'accion',
      clave: 'despues',
      etiqueta: 'Mover después',
      deshabilitada: !puedeMoverse(lista, logo.id, 'despues') || logos.enCurso,
      alElegir: () => void logos.mover(logo, 'despues'),
    },
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar…',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: () => {
        props.alPedirQuitar(logo.id)
      },
    },
  ]
}

function accionesDeLaFija(props: Props): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'identidad',
      etiqueta: 'Cambiar en Identidad…',
      principal: true,
      despuesDeCerrar: true,
      alElegir: props.alCambiarEnIdentidad,
    },
  ]
}

// Las variantes del logo: las dos fijas arriba (sólo se ven) y las propias debajo, en su orden, que se arrastran por su asa o se mueven con el
// teclado. El anuncio de dónde quedó lo movido, para el lector de pantalla.
export function FilasDeLogos(props: Props) {
  const { logos, prefijo } = props
  const { lista } = logos
  const id = useId()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (over !== null && active.id !== over.id) {
      void logos.soltar(String(active.id), String(over.id))
    }
  }
  const propiasDeLaLista = propias(lista)
  return (
    <>
      <DndContext
        id={id}
        sensors={sensores}
        collisionDetection={closestCenter}
        modifiers={[soloVertical]}
        onDragEnd={alSoltar}
        accessibility={{
          screenReaderInstructions: { draggable: INSTRUCCIONES },
          announcements: anuncios(lista),
        }}
      >
        <ul aria-label="Logos de la empresa" className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {lista.variantes.filter(esFija).map((logo) => (
            <FilaFijaDeLogo
              key={logo.id}
              logo={logo}
              prefijo={prefijo}
              acciones={accionesDeLaFija(props)}
            />
          ))}
          <SortableContext
            items={propiasDeLaLista.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
            disabled={logos.enCurso}
          >
            {propiasDeLaLista.map((logo) => (
              <FilaDeLogo
                key={logo.id}
                logo={logo}
                prefijo={prefijo}
                acciones={accionesDeLogo(logo, logos, props)}
                ocupado={logos.enCurso}
              />
            ))}
          </SortableContext>
        </ul>
      </DndContext>
      <p role="status" aria-live="polite" className="sr-only">
        {logos.anuncio}
      </p>
    </>
  )
}
