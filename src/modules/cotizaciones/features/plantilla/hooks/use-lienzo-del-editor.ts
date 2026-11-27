'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { nodosNombradosPor } from '../../../entities/plantilla/contexto-para-el-navegador'
import { disponibilidad } from '../../../entities/plantilla/edicion/disponibilidad'
import type { TonoDelCatalogo } from '../../../entities/plantilla/lectura-de-la-plantilla'
import { lecturaEnCuadricula } from '../../../entities/plantilla/lectura-en-cuadricula'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import type { EscalaDelLienzo } from '../../../entities/vista-previa-de-la-plantilla'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'
import type { PanelDeLaTarjeta } from './use-panel-de-la-tarjeta'
import type { PedidoAlPanel } from './use-pedido-al-panel'
import { useIrAlLugar, useNombreDeLaPieza } from './use-lugares-del-editor'

type Provisional = { columna: number; ancho: number } | null

// Lo que el lienzo del editor deriva y recuerda: «Ajustar | 100 %», el ancho de una columna mientras se arrastra su borde (la cuadrícula que se dibuja lo lleva sin ser
// un paso), el tamaño de la tarjeta dibujada, su lectura, qué operaciones se pueden, los nodos que nombra, el nombre de cada celda y el foco de la grilla y de
// «Contenido» del panel, que se abre al costado (`panel`) con Enter o F2 sobre un dato y con «Insertar» de la barra (`pedido`). «Ir a la celda» elige el lugar de un
// rechazo.
export function useLienzoDelEditor({
  editor,
  panel,
  contexto,
  tonos,
  irA,
}: {
  editor: EditorDeLaCuadricula
  panel: PanelDeLaTarjeta
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  irA: { donde: string; vez: number } | null
}) {
  const [escala, setEscala] = useState<EscalaDelLienzo>('ajustar')
  const [provisional, setProvisional] = useState<Provisional>(null)
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null)
  const [pedido, setPedido] = useState<PedidoAlPanel | null>(null)
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
  // Abre el panel de la celda (si no lo está) y le pide lo suyo: elegir el tipo de contenido y enfocar su campo.
  const pedirAlPanel = (tipo: PedidoAlPanel['tipo']) => {
    setPedido((antes) => ({ vez: (antes?.vez ?? 0) + 1, tipo }))
    if (!panel.celda) panel.abrirCelda()
  }
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
    pedido,
    pedirAlPanel,
    alAtenderElPedido: useCallback(() => {
      setPedido(null)
    }, []),
    // Enter o F2 sobre un dato o el logo: abre el panel de la celda en su campo «Contenido»; sobre un texto con datos, en su campo «Texto», que está junto a «Contenido».
    alEditarContenido: () => {
      pedirAlPanel('foco')
    },
  }
}

export type LienzoDelEditor = ReturnType<typeof useLienzoDelEditor>
