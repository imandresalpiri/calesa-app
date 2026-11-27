import type { Disponibilidad } from '../../../../../entities/plantilla/edicion/disponibilidad'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'

// Lo que todo grupo de la barra recibe: qué se puede (y por qué no), cómo se hace, si hay un guardado en curso y cómo se escribe un atajo en este equipo.
export type PropsDeUnGrupo = {
  disponible: Disponibilidad
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
  nombreDelAtajo: (combinacion: string) => string
}
