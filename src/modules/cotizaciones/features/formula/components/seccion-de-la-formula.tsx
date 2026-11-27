import type { ComponentType } from 'react'
import { datosO } from '@/shared/lib/errores'
import { leerFormulaDelOrigen } from '../../../areas/formula/composicion'
import { leerCatalogoDeTablas } from '../../../areas/nucleo/composicion'
import { tablasParaElCompilador } from '../../../entities/catalogo-de-tablas'
import type { FormulaDelOrigen as LaFormula } from '../../../entities/formula-del-origen'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../entities/tarjeta-en-vivo'
import type { PropsDelNuevoColor } from '../../../entities/nuevo-color'
import { FormulaDelOrigen } from './formula-del-origen'
import type { TipoDeCambioDeLaEmpresa } from './planilla/tipos'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La fórmula del origen que abre la URL: la ruta ya la leyó por id y origen (otra o una que no existe, 404).
  formula: LaFormula
  // La tarjeta de esa fórmula (área `plantilla`): la página la pide sin esperarla y aquí se espera junto a la fórmula. Nunca rechaza.
  tarjeta: Promise<LecturaDeLaTarjetaEnVivo>
  // El dibujo de la tarjeta en vivo (área `tarjeta`): lo pasa la página; este área no la importa.
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  // «+ Nuevo color» del panel de una banda (área `diseno`): la página lo pasa sólo con `cotizaciones.configurar` (sin origen, como `tono_crear()`); si no, nulo.
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  // `empresa.tipos_cambio.gestionar`: la banda «Tipo de cambio» ofrece «Cambiar en Empresa › Monedas».
  puedeCambiarTiposDeCambio: boolean
  // Los tipos de cambio de la empresa (`empresa`, que este módulo no lee aquí): la página los pide sin esperarlos. Nunca rechaza (sin lectura, ninguno).
  tiposDeCambio: Promise<readonly TipoDeCambioDeLaEmpresa[]>
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): la planilla se ve y nada se edita, publica ni descarta.
  soloLectura?: boolean
}

// La pestaña «Fórmula» de la Fórmula de un origen (Configuración › Orígenes) (4.20-2a), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: la
// publicada, el borrador y la primera página de versiones, la tarjeta de la fórmula y el catálogo de tablas (BUSCARV; null si no se leyó), a la vez. La base vuelve a decidir (policy `formulas: leer`). Una lectura de la
// fórmula que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLaFormula({
  origen,
  formula,
  tarjeta,
  TarjetaEnVivo,
  NuevoColor,
  puedeCambiarTiposDeCambio,
  tiposDeCambio,
  soloLectura = false,
}: Props) {
  const [leida, deLaTarjeta, tablas, tipos] = await Promise.all([
    leerFormulaDelOrigen(formula),
    tarjeta,
    leerCatalogoDeTablas(origen.id),
    tiposDeCambio,
  ])
  return (
    <FormulaDelOrigen
      origen={origen}
      formulaDelOrigenId={formula.id}
      formula={datosO(leida)}
      tarjeta={deLaTarjeta}
      tablas={tablasParaElCompilador(tablas)}
      TarjetaEnVivo={TarjetaEnVivo}
      NuevoColor={NuevoColor}
      puedeCambiarTiposDeCambio={puedeCambiarTiposDeCambio}
      tiposDeCambio={tipos}
      soloLectura={soloLectura}
    />
  )
}
