// Las cajas y flechas de React Flow, armadas de la disposición (`disponerDiagrama`) y del flujo: lo que dice cada una y cómo se dibuja. Sin React.
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type {
  DisposicionDelDiagrama,
  FlechaDelDiagrama,
} from '../../../../entities/disposicion-del-diagrama'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../../entities/flujo'
import {
  marcasDeLaFase,
  quienMueveEnCorto,
  requisitosEnCorto,
  rolesDeLaFase,
  type MarcaDeFase,
  type RolLeido,
} from '../../../../entities/lectura-de-fase'
import {
  resumenDeMarcas,
  type MarcaDelDiagrama,
  type MarcasDelDiagrama,
  type ResumenDeMarcas,
} from '../../../../entities/marcas-del-diagrama'

export type DatosDelNodo = {
  fase: FaseParaConfigurar
  marcas: MarcaDeFase[]
  requisitos: string
  quienMueve: string
  avisos: ResumenDeMarcas | null
  // Para el lector: las marcas, los requisitos, quién mueve, las salidas y los avisos.
  descripcion: string
  abierta: boolean
}
export type NodoDeFase = Node<DatosDelNodo, 'fase'>

export type DatosDeLaFlecha = {
  flecha: FlechaDelDiagrama
  accion: string
  haciaJubilada: boolean
  marcas: readonly MarcaDelDiagrama[]
  // Los nombres de sus dos fases, para el nombre del botón de la etiqueta.
  nombreDe: string
  nombreA: string
  // Sale de la fase abierta.
  resaltada: boolean
}
export type FlechaDeSalida = Edge<DatosDeLaFlecha, 'salida'>

const textoDeSalidas = (n: number) =>
  n === 0 ? 'Sin salidas' : n === 1 ? '1 salida' : `${String(n)} salidas`

type Pedido = {
  disposicion: DisposicionDelDiagrama
  flujo: FlujoParaConfigurar
  marcas: MarcasDelDiagrama
  faseAbierta: string | null
}

export function nodosDelDiagrama({
  disposicion,
  flujo,
  fases,
  roles,
  marcas,
  faseAbierta,
}: Pedido & {
  fases: readonly FaseParaConfigurar[]
  roles: readonly RolLeido[]
}): NodoDeFase[] {
  const porId = new Map(fases.map((f) => [f.id, f]))
  return disposicion.nodos.flatMap((nodo) => {
    const fase = porId.get(nodo.id)
    if (!fase) return []
    const avisos = resumenDeMarcas(marcas.porFase.get(fase.id) ?? [])
    const requisitos = requisitosEnCorto(flujo.requisitos, fase.id)
    const quienMueve = quienMueveEnCorto(rolesDeLaFase(flujo, fase.id, roles))
    const salidas = flujo.transiciones.filter((t) => t.deFaseId === fase.id).length
    const enLaFase = marcasDeLaFase(fase)
    const descripcion = [
      enLaFase.length > 0 ? enLaFase.join(', ') : null,
      requisitos,
      quienMueve,
      textoDeSalidas(salidas),
      avisos ? `${avisos.texto} de Revisar` : null,
    ]
      .filter((parte) => parte !== null)
      .join('. ')
    return [
      {
        id: fase.id,
        type: 'fase' as const,
        position: { x: nodo.x, y: nodo.y },
        width: disposicion.medidas.ancho,
        height: disposicion.medidas.alto,
        selectable: false,
        focusable: false,
        deletable: false,
        // Sin arrastre (el celular, o mientras se guarda) React Flow deja la caja sin puntero y el toque cae en el lienzo: el botón de adentro abre la fase.
        style: { pointerEvents: 'all' as const },
        // React Flow le pone `aria-roledescription="node"` a la caja sin rol: el botón de adentro ya dice qué es.
        domAttributes: { 'aria-roledescription': undefined },
        data: {
          fase,
          marcas: enLaFase,
          requisitos,
          quienMueve,
          avisos,
          descripcion: `${descripcion}.`,
          abierta: fase.id === faseAbierta,
        },
      },
    ]
  })
}

export function flechasDelDiagrama({
  disposicion,
  flujo,
  marcas,
  faseAbierta,
}: Pedido): FlechaDeSalida[] {
  const fases = new Map(flujo.fases.map((f) => [f.id, f]))
  const acciones = new Map(flujo.transiciones.map((t) => [t.id, t.accion ?? 'Mover']))
  return disposicion.flechas.map((flecha) => {
    const accion = acciones.get(flecha.id) ?? 'Mover'
    const resaltada = flecha.de === faseAbierta
    const de = fases.get(flecha.de)?.nombre ?? 'otra fase'
    const a = fases.get(flecha.a)
    return {
      id: flecha.id,
      type: 'salida' as const,
      source: flecha.de,
      target: flecha.a,
      focusable: false,
      selectable: false,
      deletable: false,
      // El nombre lo lleva el botón de su etiqueta (`FlechaDeSalida`): el `<g>` de React Flow no es interactivo.
      ariaLabel: `Salida «${accion}» de «${de}» a «${a?.nombre ?? 'otra fase'}»`,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: resaltada ? 'var(--color-primario)' : 'var(--color-ink-soft)',
      },
      data: {
        flecha,
        accion,
        haciaJubilada: a !== undefined && !a.activa,
        marcas: marcas.porSalida.get(flecha.id) ?? [],
        nombreDe: de,
        nombreA: a?.nombre ?? 'otra fase',
        resaltada,
      },
    }
  })
}
