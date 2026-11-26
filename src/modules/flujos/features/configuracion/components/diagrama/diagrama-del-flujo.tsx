'use client'

import '@xyflow/react/dist/base.css'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useId, useMemo, useRef } from 'react'
import { cn } from 'cn'
import { disponerDiagrama, medidasDelDiagrama } from '../../../../entities/disposicion-del-diagrama'
import type { FlujoParaConfigurar } from '../../../../entities/flujo'
import { enPx, posicionesEfectivas } from '../../../../entities/posiciones-del-diagrama'
import { disponerConPosiciones } from '../../../../entities/trazado-de-salidas'
import type { RolLeido } from '../../../../entities/lectura-de-fase'
import { useMarcasDelDiagrama } from '../../hooks/use-marcas-del-diagrama'
import { ALTO_DEL_LIENZO } from '../esqueleto-del-diagrama'
import type { HuecosDelFlujo } from '../huecos'
import { ContextoDelLienzo, type Lienzo } from './contexto-del-lienzo'
import { ControlesDelDiagrama } from './controles-del-diagrama'
import { flechasDelDiagrama, nodosDelDiagrama } from './datos-del-diagrama'
import { FlechaDeSalida } from './flecha-de-salida'
import { IndicadorDeCaida } from './indicador-de-caida'
import { NodoDeFase } from './nodo-de-fase'
import { TEXTOS_DE_REACT_FLOW } from './textos-de-react-flow'
import { useCajasDelLienzo } from './use-cajas-del-lienzo'
import { useOrdenAlArrastrar } from './use-orden-al-arrastrar'
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

// El diagrama del flujo: las fases como cajas en su orden y las salidas como flechas (`disponerDiagrama`). Es un apoyo visual; la lista es la versión
// navegable. Sólo este directorio importa `@xyflow/react`, y sólo `diferidos.tsx` lo pide.
export function DiagramaDelFlujo(props: Props) {
  return (
    <ReactFlowProvider>
      <LienzoDelFlujo {...props} />
    </ReactFlowProvider>
  )
}

function useDiagrama({ flujo, roles, faseAbierta }: Props, rem: number) {
  const medidas = useMemo(() => medidasDelDiagrama(rem), [rem])
  const arrastre = useOrdenAlArrastrar(flujo, medidas)
  const marcas = useMarcasDelDiagrama()
  const { fases, puedeArrastrar } = arrastre
  // El acomodo automático da la ruta de cada flecha; cada caja va a su posición guardada (o, sin ninguna, donde la puso el acomodo).
  const disposicion = useMemo(() => {
    const auto = disponerDiagrama(fases, flujo.transiciones, medidas)
    return disponerConPosiciones(auto, enPx(posicionesEfectivas(fases, auto, rem), rem))
  }, [fases, flujo.transiciones, medidas, rem])
  const base = useMemo(
    () =>
      nodosDelDiagrama({
        disposicion,
        flujo,
        fases,
        roles,
        marcas,
        faseAbierta,
        arrastrable: puedeArrastrar,
      }),
    [disposicion, flujo, fases, roles, marcas, faseAbierta, puedeArrastrar],
  )
  const arrastrando = arrastre.cae?.id ?? null
  const flechas = useMemo(
    () => flechasDelDiagrama({ disposicion, flujo, marcas, faseAbierta, arrastrando }),
    [disposicion, flujo, marcas, faseAbierta, arrastrando],
  )
  return { medidas, arrastre, disposicion, base, flechas, altura: disposicion.nodos[0]?.y ?? 0 }
}

function LienzoDelFlujo(props: Props) {
  const { ref: refDelRem, rem } = useRem()
  const { medidas, arrastre, disposicion, base, flechas, altura } = useDiagrama(props, rem)
  const cajas = useCajasDelLienzo(base, altura)
  const contenedor = useRef<HTMLElement>(null)
  const alIniciar = useVistaDelLienzo(contenedor, disposicion, {
    faseAbierta: props.faseAbierta,
    rem,
  })
  const { alAbrir } = props
  const { vieneDeArrastrar, cae } = arrastre
  const lienzo = useMemo<Lienzo>(
    () => ({ medidas, alAbrir, vieneDeArrastrar }),
    [medidas, alAbrir, vieneDeArrastrar],
  )
  const idDeLaAyuda = useId()
  const desde = cae ? arrastre.fases.findIndex((f) => f.id === cae.id) : -1
  return (
    <section
      ref={contenedor}
      aria-label="Diagrama del flujo"
      aria-describedby={idDeLaAyuda}
      className={cn(
        ALTO_DEL_LIENZO,
        'relative min-w-0 overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface-2)',
      )}
    >
      <span ref={refDelRem} aria-hidden className="pointer-events-none absolute h-0 w-[1rem]" />
      <p id={idDeLaAyuda} className="sr-only">
        Apoyo visual: «Ver como lista» es la versión para lector de pantalla.
      </p>
      <ContextoDelLienzo value={lienzo}>
        <ReactFlow
          nodes={cajas.nodos}
          edges={flechas}
          nodeTypes={TIPOS_DE_NODO}
          edgeTypes={TIPOS_DE_FLECHA}
          onNodesChange={cajas.alCambiar}
          onNodeDrag={(_, nodo) => {
            arrastre.alArrastrar(nodo.id, nodo.position.x)
          }}
          onNodeDragStop={(_, nodo) => {
            cajas.aLaBase()
            void arrastre.alSoltar(nodo.id, nodo.position.x)
          }}
          onInit={() => {
            alIniciar()
          }}
          nodesDraggable={arrastre.puedeArrastrar}
          // Sin desplazarse solo al arrastrar cerca del borde: el lienzo corría y la fase caía lejos. En un flujo largo, «Ver todo el flujo» y arrastrar.
          autoPanOnNodeDrag={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          disableKeyboardA11y
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          minZoom={0.25}
          maxZoom={1.5}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
          ariaLabelConfig={TEXTOS_DE_REACT_FLOW}
        >
          <ControlesDelDiagrama sinAnimar={sinAnimar} />
          {cae && cae.columna !== desde ? (
            <IndicadorDeCaida columna={cae.columna} altura={altura} medidas={medidas} />
          ) : null}
        </ReactFlow>
      </ContextoDelLienzo>
    </section>
  )
}
