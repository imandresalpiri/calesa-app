import { leerCotizacionesDelProyecto } from '@/modules/repuestos'
import { CotizacionesDelProyectoDiferido } from '@/modules/repuestos/pantallas/cotizador'
import { ErrorDelPanel } from './error-del-panel'

type Props = {
  proyectoId: string
  // Las monedas activas que ya leyó la página: las opciones de «Nueva cotización», sin otra lectura.
  monedas: readonly { codigo: string; nombre: string }[]
  cerrado: boolean
  puedeConfigurar: boolean
  puedeEditarItems: boolean
}

// El panel «Cotizaciones» bajo los pasos (8.12-3, C9): la lista, leída recién al abrirlo y sólo si quien mira tiene `repuestos.cotizar` (lo decide la página con
// `panelesDisponibles`). Si la lectura falla, lo dice ahí con «Reintentar» y la hoja sigue. Crear revalida la página: la lista se vuelve a leer acá. Su código llega
// con `diferido()`.
export async function SeccionDeCotizaciones({
  proyectoId,
  monedas,
  cerrado,
  puedeConfigurar,
  puedeEditarItems,
}: Props) {
  const cotizaciones = await leerCotizacionesDelProyecto(proyectoId)
  if (!cotizaciones.ok) {
    return <ErrorDelPanel titulo="No se pudieron cargar las cotizaciones." />
  }
  return (
    <CotizacionesDelProyectoDiferido
      proyectoId={proyectoId}
      filas={cotizaciones.data.filas}
      hayMas={cotizaciones.data.hayMas}
      monedas={monedas}
      cerrado={cerrado}
      puedeConfigurar={puedeConfigurar}
      puedeEditarItems={puedeEditarItems}
    />
  )
}
