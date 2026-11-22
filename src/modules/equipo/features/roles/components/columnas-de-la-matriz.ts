import type { Permisos } from '@/shared/lib/permisos'
import { rolDominado } from '../../../entities/dominancia'
import type { RolConConcesiones } from '../../../entities/rol'
import type { ColumnaDeRol } from './grupo-matriz'

// Una columna por rol, con lo que sus celdas necesitan saber: si la persona lo edita (gestiona roles y domina el rol) y si está guardando.
export function columnasDeLaMatriz(
  roles: readonly RolConConcesiones[],
  {
    misPermisos,
    puedeGestionar,
    rolEnCurso,
  }: {
    misPermisos: Permisos
    puedeGestionar: boolean
    rolEnCurso: string | null
  },
): ColumnaDeRol[] {
  return roles.map((rol) => ({
    rol,
    editable: puedeGestionar && rolDominado(misPermisos, rol.concesiones),
    ocupado: rolEnCurso === rol.id,
  }))
}
