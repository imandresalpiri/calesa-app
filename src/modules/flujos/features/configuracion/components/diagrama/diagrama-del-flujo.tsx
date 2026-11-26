'use client'

import '@xyflow/react/dist/base.css'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowProps,
} from '@xyflow/react'
import { useId, useRef } from 'react'
import type { FlujoParaConfigurar } from '../../../../entities/flujo'
import type { RolLeido } from '../../../../entities/lectura-de-fase'
import type { HuecosDelFlujo } from '../huecos'
import { MarcoDelLienzo } from '../marco-del-lienzo'
import { AvisoAlSoltar } from './aviso-al-soltar'
import type {
  FlechaDeSalida as FlechaDelLienzo,
  NodoDeFase as NodoDelLienzo,
} from './datos-del-diagrama'
import { BarraDelLienzo } from './barra-del-lienzo'
import { ContextoDelLienzo } from './contexto-del-lienzo'
import { FlechaDeSalida } from './flecha-de-salida'
import { NodoDeFase } from './nodo-de-fase'
import { TEXTOS_DE_REACT_FLOW } from './textos-de-react-flow'
import { useCajasDelLienzo } from './use-cajas-del-lienzo'
import { useDiagrama } from './use-diagrama'
import { useHerramientasDelLienzo } from './use-herramientas-del-lienzo'
import { useRem } from './use-rem'
import { sinAnimar, useVistaDelLienzo } from './use-vista-del-lienzo'

type Props = {
  flujo: FlujoParaConfigurar
  roles: readonly RolLeido[]
  // Los mismos que la lista: si el código no llega, `diferido()` la dibuja con estas props.
  huecos: HuecosDelFlujo
  faseAbierta: string | null
  alAbrir: (faseId: string) => void
}

const TIPOS_DE_NODO = { fase: NodoDeFase }
const TIPOS_DE_FLECHA = { salida: FlechaDeSalida }
// Lo que no cambia: el foco va a los botones de cajas y flechas (no a los de React Flow), nada se selecciona ni se borra con Supr (quitar pide confirmar),
// la rueda desplaza y con Ctrl o Cmd hace zoom, y el doble clic es para crear.
const AYUDA =
  'Tab recorre las fases y las salidas. Con una fase enfocada, las flechas la mueven. Ctrl+Z deshace. «Ver como lista» es la versión para lector de pantalla.'

const FIJAS: Partial<ReactFlowProps<NodoDelLienzo, FlechaDelLienzo>> = {
  nodesFocusable: false,
  edgesFocusable: false,
  elementsSelectable: false,
  disableKeyboardA11y: true,
  deleteKeyCode: null,
  panOnScroll: true,
  zoomOnScroll: false,
  zoomActivationKeyCode: ['Control', 'Meta'],
  zoomOnDoubleClick: false,
  preventScrolling: true,
  minZoom: 0.25,
  maxZoom: 1.5,
  onlyRenderVisibleElements: true,
  proOptions: { hideAttribution: true },
  ariaLabelConfig: TEXTOS_DE_REACT_FLOW,
}

// El minimapa ayuda a ubicarse con muchas fases libres; con pocas es ruido.
const FASES_PARA_EL_MINIMAPA = 6

// El diagrama del flujo, editable: cada fase donde se la dejó (o, sin ninguna movida, en el acomodo automático), las salidas como flechas que siguen a sus
// cajas. Se arrastran las fases (o se mueven con el teclado), se vinculan arrastrando su asa, se crea una con doble clic o desde la barra flotante, y se
// deshace con Ctrl+Z. La rueda desplaza el lienzo; con Ctrl o Cmd, zoom. La lista es la versión navegable. Sólo este directorio importa `@xyflow/react`, y
// sólo `diferidos.tsx` lo pide.
export function DiagramaDelFlujo(props: Props) {
  return (
    <MarcoDelLienzo>
      <ReactFlowProvider>
        <LienzoDelFlujo {...props} />
      </ReactFlowProvider>
    </MarcoDelLienzo>
  )
}

function LienzoDelFlujo(props: Props) {
  const { flujo, alAbrir } = props
  const { ref: refDelRem, rem } = useRem()
  const contenedor = useRef<HTMLElement>(null)
  const d = useDiagrama({ ...props, rem, contenedor })
  const cajas = useCajasDelLienzo(d.base)
  const herramientas = useHerramientasDelLienzo({
    diagrama: d,
    contenedor,
    rem,
    alAbrir,
    vieneDeArrastrar: cajas.vieneDeArrastrar,
  })
  const alIniciar = useVistaDelLienzo(contenedor, d.disposicion, {
    faseAbierta: props.faseAbierta,
    rem,
  })
  const puedeMover = d.edicion.mover === null
  const idDeLaAyuda = useId()
  return (
    <section
      ref={contenedor}
      aria-label="Diagrama del flujo"
      aria-describedby={idDeLaAyuda}
      onDoubleClick={herramientas.alDobleClic}
      onKeyDown={herramientas.alTeclear}
      className="relative size-full min-w-0 overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface-2)"
    >
      <span ref={refDelRem} aria-hidden className="pointer-events-none absolute h-0 w-[1rem]" />
      <p id={idDeLaAyuda} className="sr-only">
        {AYUDA}
      </p>
      <ContextoDelLienzo value={herramientas.lienzo}>
        <ReactFlow
          nodes={cajas.nodos}
          edges={d.flechas}
          nodeTypes={TIPOS_DE_NODO}
          edgeTypes={TIPOS_DE_FLECHA}
          onNodesChange={cajas.alCambiar}
          onNodeDragStart={cajas.alEmpezar}
          onNodeDragStop={(_, nodo) => {
            cajas.alSoltar()
            herramientas.alSoltarCaja(nodo.id, nodo.position)
          }}
          onConnectEnd={d.vincular.alSoltar}
          onEdgeClick={(_, flecha) => {
            d.salidas?.abrir(flecha.id, flecha.source)
          }}
          onInit={() => {
            alIniciar()
          }}
          nodesDraggable={puedeMover}
          nodesConnectable={d.edicion.vincular === null}
          snapToGrid
          snapGrid={[rem, rem]}
          {...FIJAS}
        >
          <Background variant={BackgroundVariant.Dots} gap={2 * rem} size={1} />
          <BarraDelLienzo
            nuevaFase={herramientas.nuevaFase}
            ordenarSolo={herramientas.ordenarSolo}
            estado={herramientas.estado}
            sinAnimar={sinAnimar}
          />
          {!d.angosto && flujo.fases.length >= FASES_PARA_EL_MINIMAPA ? (
            <MiniMap pannable zoomable ariaLabel="Minimapa" position="bottom-right" />
          ) : null}
        </ReactFlow>
      </ContextoDelLienzo>
      <AvisoAlSoltar aviso={d.vincular.aviso} />
    </section>
  )
}
