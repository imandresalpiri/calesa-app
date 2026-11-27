import { datosO } from '@/shared/lib/errores'
import { leerCatalogoDeTablas, leerNivelesDeAcceso } from '../../../areas/nucleo/composicion'
import {
  leerDisenoDelOrigen,
  leerNivelesDelDiseno,
  leerTonosDelCatalogo,
} from '../../../areas/diseno/composicion'
import type { FormulaDelOrigen } from '../../../entities/formula-del-origen'
import { DisenoDelOrigenDiferido } from './diferidos'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La fórmula del origen que abre la URL: la ruta ya la leyó por id y origen.
  formula: FormulaDelOrigen
  // `equipo.roles.gestionar`: el inspector ofrece «+ Nuevo nivel» (con la lista de los niveles y su tope, que se lee sólo entonces).
  puedeCrearNiveles: boolean
  // `cotizaciones.configurar` sin origen (como `tono_crear()`): el inspector ofrece «+ Nuevo color».
  puedeCrearColores: boolean
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): la hoja se ve y no se edita.
  soloLectura?: boolean
}

// La pestaña «Hoja» de la Fórmula de un origen (Configuración › Orígenes) (el diseño de la hoja, 4.22-2), leída en el servidor con la sesión de quien mira y detrás de
// `<Suspense>`: el borrador o la publicada, los niveles, los colores, el catálogo de tablas del origen (la ayuda de una celda) y, con `equipo.roles.gestionar`,
// la lista de niveles con su tope («+ Nuevo nivel»). La base
// vuelve a decidir (policy `formulas: leer`). Una lectura del diseño o de los niveles que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDelDiseno({
  origen,
  formula,
  puedeCrearNiveles,
  puedeCrearColores,
  soloLectura = false,
}: Props) {
  const [leida, niveles, catalogo, lista, tablas] = await Promise.all([
    leerDisenoDelOrigen(formula.id),
    leerNivelesDelDiseno(),
    leerTonosDelCatalogo(),
    puedeCrearNiveles && !soloLectura ? leerNivelesDeAcceso() : null,
    leerCatalogoDeTablas(origen.id),
  ])
  // El tono es adorno: si su lectura falla, la vista previa se dibuja sin colores, el color de una sección no se elige (`catalogo` nulo) y la pestaña sigue.
  const tonos = catalogo.ok
    ? catalogo.data.tonos.map((t) => ({
        clave: t.clave,
        claro: t.colores.claro,
        oscuro: t.colores.oscuro,
      }))
    : []
  return (
    <DisenoDelOrigenDiferido
      origen={origen}
      formulaDelOrigenId={formula.id}
      leida={datosO(leida)}
      niveles={datosO(niveles)}
      tonos={tonos}
      catalogo={
        catalogo.ok ? catalogo.data.tonos.map((t) => ({ clave: t.clave, nombre: t.nombre })) : null
      }
      // Las tablas para la ayuda de una celda: si el catálogo no se leyó, el inspector ofrece las que nombra la fórmula y la pestaña sigue.
      tablas={tablas}
      // «+ Nuevo nivel» es un atajo: si su lista no se leyó, no se ofrece y la pestaña sigue.
      listaDeNiveles={lista?.ok ? lista.data : null}
      puedeCrearColores={puedeCrearColores && catalogo.ok && !soloLectura}
      soloLectura={soloLectura}
    />
  )
}
