'use client'

import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { EstiloDeTonos, SimbolosDeXCell, type Tono } from '@/shared/ui/xcell'
import type { ContextoDeHoja } from '../../../../entities/binding'
import type { AnchoDeLaVistaPrevia } from '../../../../entities/diseno/anchos-de-la-vista-previa'
import { cifrasDelDiseno } from '../../../../entities/diseno/cifras-del-diseno'
import {
  hojaDeLaVistaPrevia,
  type HojaDeLaVistaPrevia,
} from '../../../../entities/diseno/hoja-del-diseno'
import {
  seccionesDelLienzo,
  type SeccionDelLienzo,
} from '../../../../entities/diseno/lienzo-de-la-hoja'
import type { PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import { dondeVaElTotal } from '../../../../entities/diseno/total-de-la-hoja'
import { entradasIniciales, indiceDeHoja } from '../../../../entities/entradas'
import {
  idsDelLienzo,
  ID_DE_SECCION,
  ID_DEL_FIN,
  type IdsDelLienzo,
} from '../../hooks/ids-del-lienzo'
import { nombreDeLaPieza } from '../../hooks/operaciones-de-la-hoja'
import { useApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { useArrastreDeLaHoja } from '../../hooks/use-arrastre-de-la-hoja'
import type { EdicionesDelDiseno } from '../../hooks/use-ediciones-del-diseno'
import type { EditorDelDiseno } from '../../hooks/use-editor-del-diseno'
import { MarcoEscalado } from './marco-escalado'
import { CabeceraDelLienzo, ResumenDelLienzo } from './piezas-fijas-del-lienzo'
import { SIN_TITULO } from './seccion-en-el-lienzo'
import { SeccionesDelLienzo } from './secciones-del-lienzo'
import { SumarSeccion } from './sumar-seccion'

type Props = {
  origen: { id: string; nombre: string }
  editor: EditorDelDiseno
  ediciones: EdicionesDelDiseno
  // Los parámetros de la versión, para las cifras de prueba.
  params: unknown
  tonos: readonly Tono[]
  vista: AnchoDeLaVistaPrevia
  elegida: PiezaDeLaHoja | null
  elegir: (pieza: PiezaDeLaHoja | null) => void
  alAnunciar: (texto: string) => void
}

export const ETIQUETA_DEL_LIENZO = 'Hoja en edición'

function useContexto(hoja: HojaDeLaVistaPrevia, definicion: unknown, params: unknown) {
  const respuesta = useMemo(() => cifrasDelDiseno(definicion, params), [definicion, params])
  const indice = useMemo(
    () => indiceDeHoja(hoja.secciones, hoja.cabecera.modos, hoja.cabecera.modoPorDefecto),
    [hoja.secciones, hoja.cabecera.modos, hoja.cabecera.modoPorDefecto],
  )
  return useMemo<ContextoDeHoja>(
    () => ({ indice, entradas: entradasIniciales(indice), respuesta }),
    [indice, respuesta],
  )
}

// Cómo se llama lo que se arrastra o lo que está debajo, para los anuncios del arrastre.
function nombrePorId(
  ids: IdsDelLienzo,
  secciones: readonly SeccionDelLienzo[],
  etiquetas: ReadonlyMap<string, string>,
) {
  const titulo = (id: string) => secciones.find((s) => s.id === id)?.titulo ?? SIN_TITULO
  return (id: string) => {
    if (id.startsWith(ID_DE_SECCION))
      return `la sección «${titulo(id.slice(ID_DE_SECCION.length))}»`
    if (id.startsWith(ID_DEL_FIN)) return `el final de «${titulo(id.slice(ID_DEL_FIN.length))}»`
    const lugar = ids.lugares.get(id)
    return lugar === undefined ? id : nombreDeLaPieza(lugar.clave, etiquetas)
  }
}

// Lo que sigue al puntero mientras se arrastra: el nombre de la pieza o la sección (fuera del lienzo escalado, a tamaño real).
function LoQueSeArrastra({ nombre }: { nombre: string | null }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <DragOverlay dropAnimation={null}>
      {nombre === null ? null : (
        <span className="inline-flex rounded-(--radius-md) bg-(--color-ink) px-2 py-1 text-(length:--text-sm) text-(--color-paper) shadow-(--shadow-md)">
          {nombre}
        </span>
      )}
    </DragOverlay>,
    document.body,
  )
}

// El lienzo del editor de la hoja: la hoja dibujada con los componentes de `/cotizaciones/nuevo` a la vista elegida (escalada para entrar), con cifras de prueba.
// Cada pieza se elige con un clic y se mueve arrastrándola (entre secciones también); cada sección, igual. La cabecera se elige; el resumen, sólo si la tarjeta
// del total todavía no está en una sección (un diseño de antes: su inspector la ubica). Debajo, «+ Sección principal» y «+ Sección avanzada».
export function LienzoDeLaHoja({
  origen,
  editor,
  ediciones,
  params,
  tonos,
  vista,
  elegida,
  elegir,
  alAnunciar,
}: Props) {
  const { trabajo, definicion } = editor
  const secciones = useMemo(() => seccionesDelLienzo(trabajo, definicion), [trabajo, definicion])
  const hoja = useMemo(
    () => hojaDeLaVistaPrevia(origen, trabajo, definicion, tonos),
    [origen, trabajo, definicion, tonos],
  )
  const contexto = useContexto(hoja, definicion, params)
  const ids = useMemo(() => idsDelLienzo(trabajo), [trabajo])
  const nombre = nombrePorId(ids, secciones, editor.nombresDeNodos)
  const arrastre = useArrastreDeLaHoja({
    trabajo,
    ids,
    ocupado: editor.ocupado,
    nombreDe: nombre,
    alMover: (clave, destino) => {
      const anuncio = editor.mover(clave, destino)
      if (anuncio !== null) alAnunciar(anuncio)
    },
    alMoverSeccion: ediciones.moverSeccion,
  })
  const apoyo = useApoyoDelLienzo({
    editor,
    ediciones,
    contexto,
    elegida,
    elegir,
    arrastre: {
      activo: arrastre.activo === null ? null : (ids.lugares.get(arrastre.activo) ?? null),
      destino: arrastre.destino,
    },
    alAnunciar,
  })
  return (
    <MarcoEscalado vista={vista} etiqueta={ETIQUETA_DEL_LIENZO}>
      <div data-hoja-del-lienzo="" className="@container/hoja grid min-w-0 gap-4 p-4">
        <SimbolosDeXCell />
        <EstiloDeTonos tonos={hoja.tonos} />
        <div className="flex min-w-0 flex-col gap-4 @4xl/hoja:flex-row @4xl/hoja:items-start">
          <div className="grid min-w-0 flex-1 gap-4">
            <CabeceraDelLienzo hoja={hoja} contexto={contexto} apoyo={apoyo} />
            <DndContext {...arrastre.contexto}>
              <SeccionesDelLienzo
                secciones={secciones}
                ids={ids}
                sobre={arrastre.seccionDestino}
                activo={arrastre.activo}
                apoyo={apoyo}
                editor={editor}
              />
              <LoQueSeArrastra nombre={arrastre.activo === null ? null : nombre(arrastre.activo)} />
            </DndContext>
            <SumarSeccion
              ocupado={editor.ocupado}
              alSumar={(presentacion) => {
                elegir({ pieza: 'seccion', seccion: editor.sumarSeccion(presentacion) })
              }}
            />
          </div>
          <ResumenDelLienzo
            hoja={hoja}
            contexto={contexto}
            totalEnLaHoja={dondeVaElTotal(trabajo) !== null}
            apoyo={apoyo}
          />
        </div>
      </div>
    </MarcoEscalado>
  )
}
