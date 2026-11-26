'use client'

import {
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type ClientRect,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useRef, useState } from 'react'
import type { Diseno } from '../../../entities/diseno'
import { EN_LA_VISTA_APILADA, type Nombrar } from '../../../entities/diseno/anuncios-de-la-rejilla'
import type { PiezaDeLaHoja } from '../../../entities/diseno/pieza-de-la-hoja'
import type { Caida } from '../../../entities/diseno/soltar-en-la-rejilla'
import { caidaBajoElPunto, type MarcaDibujada } from './caida-bajo-el-punto'
import {
  ID_DE_LAS_SECCIONES,
  piezaDelId,
  type DatosDeDondeCae,
  type DatosDeLoQueSeArrastra,
  type IdsDelLienzo,
} from './ids-del-lienzo'

// El punto de lo que se arrastra que decide dónde cae y en qué celda: junto a su esquina de arriba a la izquierda (donde quedaría la pieza), no el puntero.
// A pocos px de la pantalla: con el lienzo achicado una columna mide menos de 20, y un punto más adentro caería en la siguiente. El destino y la celda salen
// del mismo punto: lo que la marca dice es lo que pasa al soltar.
const DENTRO_DE_LA_ESQUINA = 8
const puntoDe = (r: ClientRect) => ({
  x: r.left + Math.min(r.width / 2, DENTRO_DE_LA_ESQUINA),
  y: r.top + Math.min(r.height / 2, DENTRO_DE_LA_ESQUINA),
})

// La rejilla de las principales recibe también lo que cae debajo de ella: soltar debajo de todo crea la fila siguiente.
const dentro = (p: { x: number; y: number }, r: ClientRect, abajoAbierto: boolean) =>
  p.x >= r.left && p.x <= r.right && p.y >= r.top && (abajoAbierto || p.y <= r.bottom)

// Lo que se arrastra sólo cae en lo de su clase (una pieza en la rejilla de una sección, una principal o el bloque en la de las principales, una avanzada sobre
// otra) y donde está su punto.
const deteccion: CollisionDetection = ({
  active,
  collisionRect,
  droppableContainers,
  droppableRects,
}) => {
  const clase = (active.data.current as DatosDeLoQueSeArrastra | undefined)?.clase
  const punto = puntoDe(collisionRect)
  for (const c of droppableContainers) {
    const acepta = (c.data.current as DatosDeDondeCae | undefined)?.acepta
    const rect = droppableRects.get(c.id)
    if (
      acepta === clase &&
      rect !== undefined &&
      dentro(punto, rect, c.id === ID_DE_LAS_SECCIONES)
    ) {
      return [{ id: c.id, data: { droppableContainer: c, value: 0 } }]
    }
  }
  return []
}

const mismaMarca = (a: MarcaDibujada | null, b: MarcaDibujada | null) =>
  a === b || (a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b))

// «Precio: columna 7, fila 2.»: el texto de la marca tras el nombre.
const enLaFrase = (texto: string) => {
  const t = `${texto.charAt(0).toLowerCase()}${texto.slice(1)}`
  return t.endsWith('.') ? t : `${t}.`
}

type Args = {
  trabajo: Diseno
  ids: IdsDelLienzo
  ocupado: boolean
  nombrar: Nombrar
  alSoltar: (p: PiezaDeLaHoja, caida: Caida) => void
  alAnunciar: (texto: string) => void
}

// El arrastre del lienzo con el puntero (el clic elige; arrastrar 6 px mueve). Nada se mueve mientras se arrastra (el lienzo está escalado con `zoom` y una
// traslación se escalaría dos veces): la marca dice dónde cae y si se puede, y el cambio se aplica al soltar. Con el teclado se mueve con Alt+flechas y el
// «⋯» de la pieza (`use-teclas-de-la-pieza.ts`).
export function useArrastreDeLaHoja({
  trabajo,
  ids,
  ocupado,
  nombrar,
  alSoltar,
  alAnunciar,
}: Args) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activo, setActivo] = useState<string | null>(null)
  const [marca, setMarca] = useState<MarcaDibujada | null>(null)
  const caida = useRef<Caida | 'apilada' | null>(null)
  // La marca de este paso para el anuncio (que dnd-kit pide justo después de `alMoverse`, antes de volver a dibujar).
  const ultima = useRef<MarcaDibujada | null>(null)
  const anunciado = useRef<string | null>(null)
  const hoja = { diseno: trabajo, nombre: nombrar }
  const piezaDe = (id: UniqueIdentifier) => piezaDelId(ids, String(id))
  const nombreDe = (id: UniqueIdentifier) => {
    const p = piezaDe(id)
    if (p === null) return String(id)
    return p.pieza === 'seccion' ? `la sección ${nombrar(p)}` : nombrar(p)
  }
  const terminar = () => {
    setActivo(null)
    setMarca(null)
    caida.current = null
    ultima.current = null
    anunciado.current = null
  }
  // El lugar bajo el punto sale de las colisiones de este paso: `over` llega un paso tarde (dnd-kit lo pone después de avisar el movimiento) y, al cruzar a
  // otra sección de un salto, mediría el punto con la rejilla de la que se dejó.
  const alMoverse = ({ active, collisions }: DragMoveEvent) => {
    const pieza = piezaDe(active.id)
    const rect = active.rect.current.translated
    const en = collisions?.[0]?.id ?? null
    const bajo =
      pieza === null || en === null || rect === null
        ? null
        : caidaBajoElPunto(hoja, pieza, String(en), puntoDe(rect))
    caida.current = bajo?.caida ?? null
    const nueva = bajo?.marca ?? null
    ultima.current = nueva
    setMarca((antes) => (mismaMarca(antes, nueva) ? antes : nueva))
  }
  const alTerminar = ({ active }: DragEndEvent) => {
    const pieza = piezaDe(active.id)
    const donde = caida.current
    terminar()
    if (ocupado || pieza === null || donde === null) return
    if (donde === 'apilada') alAnunciar(EN_LA_VISTA_APILADA)
    else alSoltar(pieza, donde)
  }
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${nombreDe(active.id)}.`,
    // Sólo cuando cambia la celda o lo que hay debajo: «Precio: columna 7, fila 2.», «Precio: ahí está «Flete».».
    onDragMove: ({ active }) => {
      const m = ultima.current
      const texto = m === null ? null : `${nombreDe(active.id)}: ${enLaFrase(m.texto)}`
      if (texto === null || texto === anunciado.current) return undefined
      anunciado.current = texto
      return texto
    },
    onDragOver: () => undefined,
    // Lo que se movió lo dice la región del editor («Moviste…»).
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => `Se canceló: ${nombreDe(active.id)} volvió a su lugar.`,
  }
  return {
    activo,
    // Cómo se llama lo que se arrastra (lo que sigue al puntero).
    nombre: activo === null ? null : nombreDe(activo),
    // Dónde se dibuja la marca de lo que se arrastra, con su estado y su texto; nula si no cae en ningún lado.
    marca,
    contexto: {
      sensors: sensores,
      collisionDetection: deteccion,
      onDragStart: ({ active }: DragStartEvent) => {
        setActivo(String(active.id))
      },
      onDragMove: alMoverse,
      onDragEnd: alTerminar,
      onDragCancel: terminar,
      accessibility: { announcements: anuncios },
    },
  }
}

export type ArrastreDeLaHoja = ReturnType<typeof useArrastreDeLaHoja>
