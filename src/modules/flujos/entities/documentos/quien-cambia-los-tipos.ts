// Quién cambia cada grupo de tipos de documento en el flujo que se ve: lo dibuja el drawer (lectura con su motivo) y lo pregunta «Nuevo tipo de
// documento» («Para»). Es la primera llave: la base vuelve a decidir cada escritura (un compartido pide el permiso en cada origen que lo usa).
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { FlujoFijo } from '../selector-de-flujos'
import type { ClaveDeGrupo } from './tipo-de-documento'

export type QuienCambiaLosTipos = { propios: boolean; compartidos: boolean }

// En un origen: los propios, quien configura su flujo o gestiona ahí los catálogos de logística; los compartidos, sólo quien gestiona ahí los catálogos.
// En el flujo de repuestos: los propios, quien lo configura; los compartidos, quien gestiona los catálogos en algún origen.
export function quienCambiaLosTipos(permisos: Permisos, fijo: FlujoFijo): QuienCambiaLosTipos {
  if ('origenId' in fijo) {
    const catalogos = puede(permisos, 'logistica.catalogos.gestionar', fijo.origenId)
    return {
      propios: catalogos || puede(permisos, 'flujos.configurar', fijo.origenId),
      compartidos: catalogos,
    }
  }
  return {
    propios: puede(permisos, 'repuestos.configurar'),
    compartidos: puede(permisos, 'logistica.catalogos.gestionar'),
  }
}

// El grupo con que abre «Nuevo tipo de documento»: el de `?de=` si quien mira puede crearlo ahí; si no, el otro; nulo si no puede en ninguno.
export function grupoParaCrear(
  quien: QuienCambiaLosTipos,
  pedido: ClaveDeGrupo,
): ClaveDeGrupo | null {
  const puedeEn = (clave: ClaveDeGrupo) => (clave === 'origen' ? quien.propios : quien.compartidos)
  if (puedeEn(pedido)) {
    return pedido
  }
  const otro: ClaveDeGrupo = pedido === 'origen' ? 'compartido' : 'origen'
  return puedeEn(otro) ? otro : null
}

export const MOTIVO_SIN_CREAR_TIPOS = 'No puedes crear tipos de documento en este flujo.'
