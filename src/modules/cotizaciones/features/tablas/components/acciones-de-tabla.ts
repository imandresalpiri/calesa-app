import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  AVISO_CON_CAMBIOS_DE_FILAS,
  AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR,
} from '../../../entities/tablas/estructura'

type Quehaceres = {
  alAbrirColumnas: () => void
  alDesactivar: () => void
}

const columnas = (alElegir: () => void, deshabilitada: boolean): AccionDeMenu => ({
  tipo: 'accion',
  clave: 'columnas',
  etiqueta: 'Columnas',
  despuesDeCerrar: true,
  deshabilitada,
  alElegir,
})

const desactivar = (alElegir: () => void, deshabilitada: boolean): AccionDeMenu => ({
  tipo: 'accion',
  clave: 'desactivar',
  etiqueta: 'Desactivar',
  destructiva: true,
  despuesDeCerrar: true,
  deshabilitada,
  alElegir,
})

const SEPARADOR: AccionDeMenu = { tipo: 'separador', clave: 'antes-de-desactivar' }

// El «⋯» de una tabla en la lista: Editar filas · Columnas · ─ · Desactivar. Los tres llevan a la tabla abierta (`?tabla=<id>`, con su `?panel=`), donde se sabe
// si hay cambios de filas sin publicar.
export function menuDeTablaEnLaLista({
  alEditarFilas,
  alAbrirColumnas,
  alDesactivar,
}: Quehaceres & { alEditarFilas: () => void }): AccionDeMenu[] {
  return [
    { tipo: 'accion', clave: 'editar-filas', etiqueta: 'Editar filas', alElegir: alEditarFilas },
    columnas(alAbrirColumnas, false),
    SEPARADOR,
    desactivar(alDesactivar, false),
  ]
}

// El «⋯» del encabezado del editor: Columnas · ─ · Desactivar. Con cambios de filas sin publicar los dos quedan apagados con su motivo (guardar las columnas o
// desactivar remonta el editor con otra versión y esos cambios se perderían).
export function menuDeTablaEnElEditor({
  cambios,
  alAbrirColumnas,
  alDesactivar,
}: Quehaceres & { cambios: boolean }): AccionDeMenu[] {
  return [
    columnas(alAbrirColumnas, cambios),
    ...(cambios
      ? [{ tipo: 'nota' as const, clave: 'motivo-de-columnas', texto: AVISO_CON_CAMBIOS_DE_FILAS }]
      : []),
    SEPARADOR,
    desactivar(alDesactivar, cambios),
    ...(cambios
      ? [
          {
            tipo: 'nota' as const,
            clave: 'motivo-de-desactivar',
            texto: AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR,
          },
        ]
      : []),
  ]
}
