import type { AccionesDeHoja } from '../../../hoja/hooks/use-hoja'

const nada = () => undefined

// La hoja del lienzo sólo se dibuja: sus acciones no hacen nada (y cada pieza va `inert`).
export const ACCIONES_QUIETAS: AccionesDeHoja = {
  alConfirmar: nada,
  alRestablecer: nada,
  alAlternarBandera: nada,
  alElegirVariante: nada,
  alElegirModo: nada,
  alElegirAtajo: nada,
}

export const ESTADO_AL_DIA = { tipo: 'al_dia' } as const
export { nada }
