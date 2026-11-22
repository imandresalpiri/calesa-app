'use client'

import { useMemo, useRef, useState } from 'react'
import { nodosNombradosPor } from '../../../entities/plantilla/contexto-para-el-navegador'
import { disponibilidad } from '../../../entities/plantilla/edicion/disponibilidad'
import type { TonoDelCatalogo } from '../../../entities/plantilla/lectura-de-la-plantilla'
import { lecturaEnCuadricula } from '../../../entities/plantilla/lectura-en-cuadricula'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import type { EscalaDelLienzo } from '../../../entities/vista-previa-de-la-plantilla'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'
import { useIrAlLugar, useNombreDeLaPieza } from './use-lugares-del-editor'

type Provisional = { columna: number; ancho: number } | null

// Lo que el lienzo del editor deriva y recuerda: «Ajustar | 100 %», el ancho de una columna mientras se arrastra su borde (la cuadrícula que se dibuja lo lleva sin ser
// un paso), el tamaño de la tarjeta dibujada, su lectura, qué operaciones se pueden, los nodos que nombra, el nombre de cada celda y el foco de la grilla y de
// «Contenido» del panel. «Ir a la celda» elige el lugar de un rechazo.
export function useLienzoDelEditor({
  editor,
  contexto,
  tonos,
  irA,
}: {
  editor: EditorDeLaCuadricula
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  irA: { donde: string; vez: number } | null
}) {
  const [escala, setEscala] = useState<EscalaDelLienzo>('ajustar')
  const [provisional, setProvisional] = useState<Provisional>(null)
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null)
  const rejilla = useRef<HTMLDivElement>(null)
  const enfoque = useRef<HTMLDivElement>(null)
  const { plantilla, estado } = editor
  const dibujada = useMemo(
    () =>
      provisional === null
        ? plantilla
        : {
            ...plantilla,
            columnas: plantilla.columnas.map((c, k) =>
              k === provisional.columna ? { ...c, ancho: provisional.ancho } : c,
            ),
          },
    [plantilla, provisional],
  )
  const lectura = useMemo(
    () => lecturaEnCuadricula(dibujada, contexto, tonos),
    [dibujada, contexto, tonos],
  )
  const disponible = useMemo(() => disponibilidad(estado), [estado])
  const nombrados = useMemo(() => nodosNombradosPor(plantilla), [plantilla])
  const nombreDe = useNombreDeLaPieza(contexto)
  useIrAlLugar(irA, editor, rejilla)
  return {
    escala,
    setEscala,
    setProvisional,
    tamano,
    setTamano,
    rejilla,
    enfoque,
    dibujada,
    lectura,
    disponible,
    nombrados,
    nombreDe,
    // Enter o F2 sobre un dato o el logo: al campo «Contenido» del panel; sobre un texto con datos, a su campo «Texto», que está junto a «Contenido».
    alEditarContenido: () => {
      const nodo = enfoque.current
      const texto = nodo?.parentElement?.querySelector<HTMLElement>('[data-campo-del-texto]')
      ;(texto ?? nodo?.querySelector<HTMLElement>('[aria-checked="true"]') ?? nodo)?.focus()
    },
  }
}

export type LienzoDelEditor = ReturnType<typeof useLienzoDelEditor>
