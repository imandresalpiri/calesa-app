// El estado del editor de artes y su reductor: el documento que se edita, su historial y las capas elegidas. Edita la primera página (el
// documento admite varias; el editor, por ahora, una). Cada acción que cambia el documento suma un paso al historial (o se funde con el
// anterior); una que no cambia nada devuelve el mismo estado. Las que crean ids reciben con qué crearlos. Puro.
import type { CapaDeArte, DocumentoDeArte, FondoDeArte, PaginaDeArte } from '../documento'
import type { Medidas } from '../formatos'
import {
  agregarCapas,
  alinearCapas,
  alternar,
  cambiarCapas,
  copiasDe,
  DESPLAZAMIENTO_DE_LA_COPIA,
  distribuirCapas,
  idsEnRecuadro,
  moverCapas,
  pegarCopias,
  portapapelesDe,
  quitarCapas,
  renombrar,
  type Portapapeles,
} from './acciones-de-capas'
import type { Alineacion } from './alinear'
import type { Caja } from './cajas'
import { agrupar, desagrupar } from './grupos'
import {
  anotar,
  deshacer,
  historialVacio,
  rehacer,
  type FusionDelPaso,
  type Historial,
} from './historial'
import { moverEnCapas, ordenar, type HaciaDonde } from './orden'

export type EstadoDelEditor = {
  documento: DocumentoDeArte
  historial: Historial<DocumentoDeArte>
  // Los ids de las capas elegidas, en el orden de la página.
  seleccion: readonly string[]
}

export type ModoDeElegir = 'reemplazar' | 'sumar' | 'alternar'

export type AccionDelEstado =
  | { tipo: 'agregar'; capas: readonly CapaDeArte[] }
  | {
      tipo: 'cambiar'
      ids: readonly string[]
      cambio: (capa: CapaDeArte) => CapaDeArte
      fusion?: FusionDelPaso
    }
  | { tipo: 'mover'; ids: readonly string[]; dx: number; dy: number; fusion?: FusionDelPaso }
  | { tipo: 'quitar' }
  | { tipo: 'duplicar'; nuevoId: () => string }
  | { tipo: 'pegar'; portapapeles: Portapapeles; nuevoId: () => string; vez: number }
  | { tipo: 'fondo'; fondo: FondoDeArte; fusion?: FusionDelPaso }
  | { tipo: 'ordenar'; hacia: HaciaDonde }
  | { tipo: 'moverEnCapas'; arrastrado: string; sobre: string }
  | { tipo: 'agrupar'; nuevoId: string }
  | { tipo: 'desagrupar' }
  | { tipo: 'renombrar'; id: string; nombre: string }
  | { tipo: 'alternar'; id: string; que: 'oculta' | 'bloqueada' }
  | { tipo: 'alinear'; como: Alineacion; medidas: Medidas }
  | { tipo: 'distribuir'; eje: 'horizontal' | 'vertical' }
  | { tipo: 'elegir'; ids: readonly string[]; modo: ModoDeElegir }
  | { tipo: 'elegirEnRecuadro'; recuadro: Caja; sumar: boolean }
  | { tipo: 'medirTexto'; id: string; alto: number }
  | { tipo: 'deshacer' }
  | { tipo: 'rehacer' }
  | { tipo: 'reemplazar'; documento: DocumentoDeArte }
  | { tipo: 'reiniciar'; documento: DocumentoDeArte }

export function estadoInicial(documento: DocumentoDeArte): EstadoDelEditor {
  return { documento, historial: historialVacio(), seleccion: [] }
}

export function paginaDe(documento: DocumentoDeArte): PaginaDeArte | undefined {
  return documento.paginas[0]
}

// Los ids que siguen en la página, en su orden.
function existentes(pagina: PaginaDeArte | undefined, ids: readonly string[]): string[] {
  const elegidos = new Set(ids)
  return (pagina?.capas ?? []).filter((c) => elegidos.has(c.id)).map((c) => c.id)
}

const mismosIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i])

function conSeleccion(estado: EstadoDelEditor, ids: readonly string[]): EstadoDelEditor {
  const seleccion = existentes(paginaDe(estado.documento), ids)
  return mismosIds(seleccion, estado.seleccion) ? estado : { ...estado, seleccion }
}

type Opciones = { fusion?: FusionDelPaso | undefined; seleccion?: readonly string[] }

// Pone la página nueva en el documento y anota el paso. Sin cambio, sólo la selección (si la hay).
function conPagina(
  estado: EstadoDelEditor,
  pagina: PaginaDeArte | null,
  opciones: Opciones = {},
): EstadoDelEditor {
  const actual = paginaDe(estado.documento)
  if (pagina === null || pagina === actual) {
    return opciones.seleccion ? conSeleccion(estado, opciones.seleccion) : estado
  }
  const documento = { ...estado.documento, paginas: [pagina, ...estado.documento.paginas.slice(1)] }
  const historial = anotar(estado.historial, estado.documento, opciones.fusion ?? null)
  return conSeleccion({ ...estado, documento, historial }, opciones.seleccion ?? estado.seleccion)
}

function elegir(
  estado: EstadoDelEditor,
  ids: readonly string[],
  modo: ModoDeElegir,
): EstadoDelEditor {
  if (modo === 'reemplazar') {
    return conSeleccion(estado, ids)
  }
  const ya = new Set(estado.seleccion)
  const todos = ids.length > 0 && ids.every((id) => ya.has(id))
  if (modo === 'alternar' && todos) {
    return conSeleccion(
      estado,
      estado.seleccion.filter((id) => !ids.includes(id)),
    )
  }
  return conSeleccion(estado, [...estado.seleccion, ...ids])
}

type Pegado = { portapapeles: Portapapeles; nuevoId: () => string; vez: number }

// Pone las copias encima de todo, corridas según cuántas veces se pegó, y las elige.
function pegar(
  estado: EstadoDelEditor,
  pagina: PaginaDeArte,
  { portapapeles, nuevoId, vez }: Pegado,
) {
  const copias = copiasDe(portapapeles, nuevoId, DESPLAZAMIENTO_DE_LA_COPIA * vez)
  return conPagina(estado, pegarCopias(pagina, copias), {
    seleccion: copias.capas.map((c) => c.id),
  })
}

// Un paso del historial; la selección queda con lo que sigue existiendo.
function viajar(estado: EstadoDelEditor, hacia: 'atras' | 'adelante'): EstadoDelEditor {
  const paso = (hacia === 'atras' ? deshacer : rehacer)(estado.historial, estado.documento)
  if (paso === null) {
    return estado
  }
  return conSeleccion(
    { ...estado, documento: paso.documento, historial: paso.historial },
    estado.seleccion,
  )
}

type Manejadores = {
  [K in AccionDelEstado['tipo']]: (
    estado: EstadoDelEditor,
    accion: Extract<AccionDelEstado, { tipo: K }>,
    pagina: PaginaDeArte,
  ) => EstadoDelEditor
}

const MANEJADORES: Manejadores = {
  agregar: (e, a, p) =>
    conPagina(e, agregarCapas(p, a.capas), { seleccion: a.capas.map((c) => c.id) }),
  cambiar: (e, a, p) => conPagina(e, cambiarCapas(p, a.ids, a.cambio), { fusion: a.fusion }),
  mover: (e, a, p) => conPagina(e, moverCapas(p, a.ids, a), { fusion: a.fusion }),
  quitar: (e, _a, p) => conPagina(e, quitarCapas(p, e.seleccion), { seleccion: [] }),
  duplicar: (e, a, p) =>
    pegar(e, p, { portapapeles: portapapelesDe(p, e.seleccion), nuevoId: a.nuevoId, vez: 1 }),
  pegar: (e, a, p) => pegar(e, p, a),
  fondo: (e, a, p) =>
    conPagina(e, p.fondo === a.fondo ? p : { ...p, fondo: a.fondo }, { fusion: a.fusion }),
  ordenar: (e, a, p) => conPagina(e, ordenar(p, e.seleccion, a.hacia)),
  moverEnCapas: (e, a, p) => conPagina(e, moverEnCapas(p, a.arrastrado, a.sobre)),
  agrupar: (e, a, p) => conPagina(e, agrupar(p, e.seleccion, a.nuevoId)),
  desagrupar: (e, _a, p) => conPagina(e, desagrupar(p, e.seleccion)),
  renombrar: (e, a, p) => conPagina(e, renombrar(p, a.id, a.nombre)),
  alternar: (e, a, p) => conPagina(e, alternar(p, a.id, a.que)),
  alinear: (e, a, p) => conPagina(e, alinearCapas(p, e.seleccion, a.como, a.medidas)),
  distribuir: (e, a, p) => conPagina(e, distribuirCapas(p, e.seleccion, a.eje)),
  elegir: (e, a) => elegir(e, a.ids, a.modo),
  elegirEnRecuadro: (e, a, p) =>
    elegir(e, idsEnRecuadro(p, a.recuadro), a.sumar ? 'sumar' : 'reemplazar'),
  // El alto que el lienzo midió de un texto: no es un paso del historial.
  medirTexto: (e, a, p) => {
    const pagina = cambiarCapas(p, [a.id], (c) =>
      c.tipo === 'texto' && c.alto !== a.alto ? { ...c, alto: a.alto } : c,
    )
    return pagina === p
      ? e
      : { ...e, documento: { ...e.documento, paginas: [pagina, ...e.documento.paginas.slice(1)] } }
  },
  deshacer: (e) => viajar(e, 'atras'),
  rehacer: (e) => viajar(e, 'adelante'),
  reemplazar: (e, a) =>
    a.documento === e.documento
      ? e
      : conSeleccion(
          { ...e, documento: a.documento, historial: anotar(e.historial, e.documento, null) },
          [],
        ),
  reiniciar: (_e, a) => estadoInicial(a.documento),
}

export function reducirEditor(estado: EstadoDelEditor, accion: AccionDelEstado): EstadoDelEditor {
  const pagina = paginaDe(estado.documento)
  if (pagina === undefined) {
    return estado
  }
  const manejar = MANEJADORES[accion.tipo] as (
    e: EstadoDelEditor,
    a: AccionDelEstado,
    p: PaginaDeArte,
  ) => EstadoDelEditor
  return manejar(estado, accion, pagina)
}

// Lo que copia «Copiar» de la selección.
export function portapapelesDeLaSeleccion(estado: EstadoDelEditor): Portapapeles | null {
  const pagina = paginaDe(estado.documento)
  if (!pagina || estado.seleccion.length === 0) {
    return null
  }
  return portapapelesDe(pagina, estado.seleccion)
}

export const puedeDeshacer = (estado: EstadoDelEditor) => estado.historial.pasado.length > 0
export const puedeRehacer = (estado: EstadoDelEditor) => estado.historial.futuro.length > 0
