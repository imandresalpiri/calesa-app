import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { lineasDelOrigen } from '../../../entities/acciones-del-origen'
import type { OrigenConUso } from '../../../entities/origen'

type Quehaceres = {
  // Quien mira gestiona orígenes (`origenes.gestionar`): sin eso sólo puede abrir.
  gestiona: boolean
  // Algo se está guardando: lo que escribe se apaga.
  enCurso: boolean
  abrir: () => void
  cambiarActivo: (activo: boolean) => void
  pedirEliminar: () => void
}

// La lista única del «⋯» de la tarjeta de un origen en la lista: «Abrir» primero (la principal: tocar la tarjeta hace lo mismo) y, con `origenes.gestionar`,
// lo mismo que el «⋯» de su página (`lineasDelOrigen`): activar o desactivar y eliminar, apagada con su motivo si algo lo ata.
export function accionesDeLaTarjeta(origen: OrigenConUso, hacer: Quehaceres): AccionDeMenu[] {
  const abrir: AccionDeMenu = {
    tipo: 'accion',
    clave: 'abrir',
    etiqueta: 'Abrir',
    principal: true,
    alElegir: hacer.abrir,
  }
  if (!hacer.gestiona) {
    return [abrir]
  }
  const gestion = lineasDelOrigen(origen, { gestiona: true }).map((linea): AccionDeMenu => {
    if (linea.tipo !== 'accion') {
      return linea
    }
    if (linea.clave === 'eliminar') {
      return {
        ...linea,
        destructiva: true,
        despuesDeCerrar: true,
        deshabilitada: linea.deshabilitada || hacer.enCurso,
        alElegir: hacer.pedirEliminar,
      }
    }
    return {
      ...linea,
      deshabilitada: hacer.enCurso,
      alElegir: () => {
        hacer.cambiarActivo(linea.clave === 'activar')
      },
    }
  })
  return [abrir, { tipo: 'separador', clave: 'separador-de-gestion' }, ...gestion]
}
