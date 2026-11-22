import type { DondeSeUsaLaTabla } from '@/modules/cotizaciones'
import {
  PANEL_DE_LAS_TABLAS,
  RUTAS,
  consultaDelDrawerDeLasTablas,
  rutaDeParteDelOrigen,
} from '@/shared/lib/rutas'
import type { ParametrosDeLaUrl } from '../../con-parametros'
import { textos } from '../../origenes/[id]/urls-viejas/pestana'

// Los paneles que son de una tabla (con `?tabla=`): sin ella no abren nada.
const PANELES_SIN_TABLA = new Set(['nueva-tabla'])

type Entrada = {
  // Los orígenes que la persona configura (`cotizaciones.configurar` en ellos), en el orden de la lista de orígenes.
  configurables: readonly string[]
  // De quién es la tabla de `?tabla=` y qué orígenes configurables tienen una propia con su clave; nulo si no hay `?tabla=` o no existe ni se ve.
  uso: DondeSeUsaLaTabla | null
  parametros: ParametrosDeLaUrl
}

// El origen donde se edita esa tabla: su dueño si es propia; si es compartida, el primero de los que configura la persona que la recibe (no tiene una propia con su clave:
// lo mismo que decide «Tapada por…»). Nulo si ninguno de los suyos la usa.
function origenDeLaTabla({ configurables, uso }: Pick<Entrada, 'configurables' | 'uso'>) {
  if (uso === null) return null
  if (uso.propiaDe !== null) return configurables.find((id) => id === uso.propiaDe) ?? null
  return configurables.find((id) => !uso.conPropia.includes(id)) ?? null
}

// A dónde lleva `/configuracion/catalogos/tablas` (la página de las tablas compartidas de antes): al drawer «Tablas» del primer origen que usa la tabla pedida y que
// la persona configura, con `?panel=tablas&tabla=<id>` y el resto de su consulta (el `?panel=` viejo de la tabla pasa a `accion`); sin tabla, al drawer del primer origen
// que configura. Con una `?tabla=` que no existe o que ninguno de sus orígenes usa, al drawer del primero, sin la tabla ni su panel. Sin ningún origen que configure, al
// inicio de Configuración.
export function destinoDeLasTablasCompartidas(entrada: Entrada): string {
  const { configurables, parametros } = entrada
  const primero = configurables[0]
  if (primero === undefined) return RUTAS.inicioDeConfiguracion
  const origen = origenDeLaTabla(entrada)
  if (origen !== null) {
    return rutaDeParteDelOrigen(
      origen,
      'planilla',
      consultaDelDrawerDeLasTablas(textos(parametros)),
    )
  }
  const { tabla: _tabla, ...resto } = textos(parametros)
  const sinPanelDeTabla =
    resto['panel'] !== undefined &&
    resto['panel'] !== PANEL_DE_LAS_TABLAS &&
    !PANELES_SIN_TABLA.has(resto['panel'])
      ? Object.fromEntries(Object.entries(resto).filter(([clave]) => clave !== 'panel'))
      : resto
  return rutaDeParteDelOrigen(primero, 'planilla', consultaDelDrawerDeLasTablas(sinPanelDeTabla))
}
