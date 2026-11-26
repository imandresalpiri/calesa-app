// Lo que dibuja el cuerpo del editor (casillas, comunes, grupos y desactivados) y los envoltorios con que se dibuja: en frío dejan pasar a
// sus hijos; con el arrastre (`arrastre/`, diferido) cada fila se vuelve ordenable sin que el cuerpo cambie.
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import type { CampoBase, CamposDelGrupo } from '@/shared/lib/campos'
import type { AccionDelCampo } from './acciones-de-campo'
import type { CasillaDelEditor, CasillasDelEditor, FijosDelEditor } from './tipos'

// Lo que el arrastre le pone a una fila o a una casilla: su nodo (que se desplaza) y su asa.
export type DelArrastre = {
  alMontar?: ((nodo: HTMLElement | null) => void) | undefined
  estilo?: CSSProperties | undefined
  asa?: ReactNode
}

// Los textos de las casillas que también dicen las filas.
export type TextosDeCasilla = Pick<
  CasillasDelEditor,
  'insignia' | 'hacer' | 'quitar' | 'motivoTope' | 'notaAlDesactivar' | 'zona'
>

export type AccionDeCasilla = 'subir' | 'bajar' | 'quitar'

export type PropsDeFila = DelArrastre & {
  campo: CampoBase
  // Todas, en su orden: las del módulo, «Dato clave» y las banderas encendidas.
  insignias: readonly string[]
  puedeGestionar: boolean
  puedeSubir: boolean
  puedeBajar: boolean
  // Con casillas: si ya está en una y si el tope está lleno.
  casilla: { textos: TextosDeCasilla; es: boolean; topeLleno: boolean } | null
  // Con permiso y sin búsqueda: guarda el lugar del asa aunque el arrastre no haya llegado.
  conAsa: boolean
  alElegir: (campoId: string, accion: AccionDelCampo) => void
}

export type PropsDeFijo = DelArrastre & {
  llave: string
  etiqueta: string
  insignia: string
  textos: TextosDeCasilla
  es: boolean
  topeLleno: boolean
  puedeGestionar: boolean
  motivoSinPermiso: string
  conAsa: boolean
  alAlternar: (llave: string) => void
}

export type PropsDeCasilla = DelArrastre & {
  casilla: CasillaDelEditor
  // 0 = primera.
  posicion: number
  total: number
  quitar: string
  zona: string
  puedeGestionar: boolean
  alElegir: (posicion: number, accion: AccionDeCasilla) => void
}

export type PropsDeLibre = {
  posicion: number
  zona: string
  alMontar?: ((nodo: HTMLElement | null) => void) | undefined
}

export type Envoltorios = {
  // Una lista que se ordena por dentro (un grupo de campos, las casillas): `id` la nombra para el teclado del arrastre.
  Lista: ComponentType<{ id: string; ids: readonly string[]; children: ReactNode }>
  Fila: ComponentType<PropsDeFila>
  Fijo: ComponentType<PropsDeFijo>
  Casilla: ComponentType<PropsDeCasilla>
  Libre: ComponentType<PropsDeLibre>
}

export type PropsDelCuerpo = {
  // El nombre de la región («Campos del origen»): un `h2` para el lector de pantalla, entre las casillas y los grupos.
  titulo: string
  tituloId: string
  // Los activos de lo que coincide con la búsqueda, por grupo; `todos` es el layout entero en el orden que se ve (mide subir y bajar).
  grupos: readonly CamposDelGrupo<CampoBase>[]
  todos: readonly CampoBase[]
  desactivados: readonly CampoBase[]
  insignias: ReadonlyMap<string, readonly string[]>
  // Las llaves de casilla de cada campo activo (por id).
  llaves: ReadonlyMap<string, string>
  // Los que coinciden con la búsqueda.
  fijos: FijosDelEditor | null
  casillas: CasillasDelEditor | null
  consulta: string
  // El layout no tiene ningún campo activo (sin mirar la búsqueda).
  sinCampos: boolean
  vacioTitulo: string
  vacioDescripcion: string
  motivoSinPermiso: string
  puedeGestionar: boolean
  ocupado: boolean
  conAsa: boolean
  alElegir: (campoId: string, accion: AccionDelCampo) => void
  alAlternarFijo: (llave: string) => void
  alElegirCasilla: (posicion: number, accion: AccionDeCasilla) => void
  alSoltarCampo: (campoId: string, despuesDe: string | null) => void
  alLimpiar: () => void
  alCrear: () => void
}
