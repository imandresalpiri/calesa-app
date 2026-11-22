// La lista única del «⋯» de un campo en el editor, en su orden (tocar la fila hace la primera). Lo imposible queda apagado con su motivo
// debajo; sin permiso, sólo «Ver».
import {
  MOTIVO_CAMPO_DE_FABRICA,
  MOTIVO_PRIMERO_DE_SU_GRUPO,
  MOTIVO_ULTIMO_DE_SU_GRUPO,
  type CampoBase,
} from '@/shared/lib/campos'
import type { AccionDeMenu } from '@/shared/ui/lista'

export type AccionDelCampo =
  | 'abrir'
  | 'hacer-dato-clave'
  | 'quitar-dato-clave'
  | 'subir'
  | 'bajar'
  | 'desactivar'
  | 'activar'
  | 'eliminar'

// Si el campo puede ser dato clave (el editor tiene casillas) y cómo está ahora.
export type DatoClaveDelCampo = {
  es: boolean
  // Por qué no se puede hacer dato clave (el tope lleno), o null.
  motivo: string | null
  hacer: string
  quitar: string
}

type Args = {
  campo: Pick<CampoBase, 'activo' | 'esSistema'>
  puedeGestionar: boolean
  puedeSubir: boolean
  puedeBajar: boolean
  datoClave: DatoClaveDelCampo | null
  // Lo que pasa además al desactivarlo («También sale de los datos clave.»), o null.
  notaAlDesactivar: string | null
  alElegir: (accion: AccionDelCampo) => void
}

function accion(
  clave: AccionDelCampo,
  etiqueta: string,
  alElegir: (accion: AccionDelCampo) => void,
  extra: Partial<Extract<AccionDeMenu, { tipo: 'accion' }>> = {},
): AccionDeMenu {
  return {
    tipo: 'accion',
    clave,
    etiqueta,
    alElegir: () => {
      alElegir(clave)
    },
    ...extra,
  }
}

// Una acción apagada lleva su motivo como nota justo debajo.
function conMotivo(linea: AccionDeMenu, motivo: string | null): AccionDeMenu[] {
  if (motivo === null || linea.tipo !== 'accion') {
    return [linea]
  }
  return [
    { ...linea, deshabilitada: true },
    { tipo: 'nota', clave: `${linea.clave}-motivo`, texto: motivo },
  ]
}

function lineasDelDatoClave(
  datoClave: DatoClaveDelCampo,
  alElegir: (accion: AccionDelCampo) => void,
): AccionDeMenu[] {
  if (datoClave.es) {
    return [accion('quitar-dato-clave', datoClave.quitar, alElegir)]
  }
  return conMotivo(accion('hacer-dato-clave', datoClave.hacer, alElegir), datoClave.motivo)
}

function lineaDeEliminar(
  campo: Args['campo'],
  alElegir: (accion: AccionDelCampo) => void,
): AccionDeMenu[] {
  return conMotivo(
    accion('eliminar', 'Eliminar…', alElegir, { destructiva: true, despuesDeCerrar: true }),
    campo.esSistema ? MOTIVO_CAMPO_DE_FABRICA : null,
  )
}

export function accionesDeCampo(args: Args): AccionDeMenu[] {
  const { campo, puedeGestionar, puedeSubir, puedeBajar, datoClave, notaAlDesactivar, alElegir } =
    args
  const abrir = accion('abrir', puedeGestionar ? 'Editar' : 'Ver', alElegir, {
    principal: true,
    despuesDeCerrar: true,
  })
  if (!puedeGestionar) {
    return [abrir]
  }
  if (!campo.activo) {
    return [
      abrir,
      accion('activar', 'Activar', alElegir),
      { tipo: 'separador', clave: 'separador-eliminar' },
      ...lineaDeEliminar(campo, alElegir),
    ]
  }
  return [
    abrir,
    ...(datoClave ? lineasDelDatoClave(datoClave, alElegir) : []),
    { tipo: 'separador', clave: 'separador-orden' },
    ...conMotivo(
      accion('subir', 'Subir', alElegir),
      puedeSubir ? null : MOTIVO_PRIMERO_DE_SU_GRUPO,
    ),
    ...conMotivo(accion('bajar', 'Bajar', alElegir), puedeBajar ? null : MOTIVO_ULTIMO_DE_SU_GRUPO),
    { tipo: 'separador', clave: 'separador-eliminar' },
    accion('desactivar', 'Desactivar', alElegir),
    ...(notaAlDesactivar === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'desactivar-nota', texto: notaAlDesactivar }]),
    ...lineaDeEliminar(campo, alElegir),
  ]
}
