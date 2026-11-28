// Quién puede qué con una plantilla de arte o una imagen de la biblioteca: espejo de `_artes_edita_plantilla()` y `_artes_gestiona_imagen()`
// de la base, que es quien decide. Sin `artes.empresa.gestionar`, cada persona crea y cambia sus privadas y sus imágenes personales, y **usa**
// (lee y duplica) las de la empresa. `gestiona` lo calcula el servidor con `puede()`: el navegador no importa el catálogo de permisos. Puro.
import type { AmbitoDeImagen, VisibilidadDeArte } from './tipos'

export type QuienMira = { yo: string; gestiona: boolean }

export type Permiso = { ok: true } | { ok: false; motivo: string }

export const MOTIVO_SIN_GESTIONAR = 'Sólo quien tiene Artes › gestionar las de la empresa.'
export const MOTIVO_DE_OTRA_PERSONA = 'Es de otra persona: sólo quien la creó puede cambiarla.'
// Los que devuelve una action cuando el servidor dice que no (la base lo rechaza igual, con 42501).
export const MOTIVO_SIN_PERMISO_DE_ARTES =
  'No tienes el permiso para cambiar las artes de la empresa.'
export const MOTIVO_SIN_COTIZACIONES_DEL_ORIGEN = 'Necesitas ver cotizaciones en ese origen.'
export const MOTIVO_SIN_ARTES = 'Necesitas ver cotizaciones en algún origen para usar Artes.'

const SI: Permiso = { ok: true }
const no = (motivo: string): Permiso => ({ ok: false, motivo })

type DeLaPlantilla = { autorId: string; visibilidad: VisibilidadDeArte }
type DeLaImagen = { duenoId: string | null; ambito: AmbitoDeImagen }

// Editar, renombrar o cambiar la miniatura: la privada, su autor; la de la empresa, quien la gestiona.
export function puedeEditarLaPlantilla(quien: QuienMira, plantilla: DeLaPlantilla): Permiso {
  if (plantilla.visibilidad === 'empresa') {
    return quien.gestiona ? SI : no(MOTIVO_SIN_GESTIONAR)
  }
  return plantilla.autorId === quien.yo ? SI : no(MOTIVO_DE_OTRA_PERSONA)
}

// Hacerla de la empresa o privada: sólo quien gestiona las de la empresa (otorga o quita la vista a todo el equipo).
export function puedeCambiarLaVisibilidad(quien: QuienMira, plantilla: DeLaPlantilla): Permiso {
  if (!quien.gestiona) {
    return no(MOTIVO_SIN_GESTIONAR)
  }
  return plantilla.visibilidad === 'privada' && plantilla.autorId !== quien.yo
    ? no(MOTIVO_DE_OTRA_PERSONA)
    : SI
}

export function puedeEliminarLaPlantilla(quien: QuienMira, plantilla: DeLaPlantilla): Permiso {
  return puedeEditarLaPlantilla(quien, plantilla)
}

// Subir a la biblioteca de la empresa (la personal la tiene todo el que ve Artes).
export function puedeSubirALaEmpresa(quien: QuienMira): Permiso {
  return quien.gestiona ? SI : no(MOTIVO_SIN_GESTIONAR)
}

// Renombrar o quitar una imagen: la personal, su dueño; la de la empresa, quien la gestiona.
export function puedeGestionarLaImagen(quien: QuienMira, imagen: DeLaImagen): Permiso {
  if (imagen.ambito === 'empresa') {
    return quien.gestiona ? SI : no(MOTIVO_SIN_GESTIONAR)
  }
  return imagen.duenoId === quien.yo ? SI : no(MOTIVO_DE_OTRA_PERSONA)
}
