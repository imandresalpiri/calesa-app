import type {
  CampoDeFase,
  ContextoDeFase,
  ErroresDeFase,
  ValoresDeFase,
} from '../../../entities/fases/reglas-de-fase'

// Lo que recibe cada bloque de «Datos»: lo escrito, el motivo de cada campo, cómo escribir y si todo está apagado (mientras guarda).
export type PropsDeBloque = {
  valores: ValoresDeFase
  errores: ErroresDeFase
  escribir: (cambios: Partial<ValoresDeFase>, campo: CampoDeFase) => void
  deshabilitado: boolean
  contexto: ContextoDeFase
}
