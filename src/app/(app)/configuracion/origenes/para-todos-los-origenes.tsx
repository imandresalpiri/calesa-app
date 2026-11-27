import { Suspense } from 'react'
import { SeccionDeLosColores } from '@/modules/cotizaciones/pantallas/diseno-colores'
import { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from '@/modules/empresa'
import { SeccionDeLaVigencia } from '@/modules/empresa/pantallas/configuracion-cotizacion'
import { Aviso } from '@/shared/ui/aviso'
import { EsqueletoDeUnaTarjeta } from '@/shared/ui/esqueletos'
import { LimiteDeTarjeta, TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'

// El grupo «Para todos los orígenes» de Configuración › Orígenes (no una sección: las tarjetas son las secciones): lo que vale para todas las cotizaciones de la empresa, en dos tarjetas de ajustes —Colores y Vigencia—, cada una
// con su modal por `?panel=`. Lo compone `src/app` (`cotizaciones` y `empresa` no se importan). Cada tarjeta lee lo suyo detrás de su `<Suspense>` y dentro de su límite: una lectura
// que falla deja esa tarjeta con «Reintentar» y la lista de orígenes sigue. Sin poder cambiar la vigencia, el motivo va aquí, en un `<Aviso>`.
export function ParaTodosLosOrigenes({
  puedeCambiarLaVigencia,
  puedeIrARoles,
}: {
  puedeCambiarLaVigencia: boolean
  puedeIrARoles: boolean
}) {
  return (
    <div role="group" aria-labelledby="para-todos-los-origenes" className="grid gap-3">
      <h2
        id="para-todos-los-origenes"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Para todos los orígenes
      </h2>
      {puedeCambiarLaVigencia ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION}</Aviso>}
      <TarjetasDeAjustes etiqueta="Para todos los orígenes">
        <LimiteDeTarjeta titulo="Colores">
          <Suspense fallback={<EsqueletoDeUnaTarjeta />}>
            <SeccionDeLosColores />
          </Suspense>
        </LimiteDeTarjeta>
        <LimiteDeTarjeta titulo="Vigencia">
          <Suspense fallback={<EsqueletoDeUnaTarjeta />}>
            <SeccionDeLaVigencia
              puedeCambiar={puedeCambiarLaVigencia}
              puedeIrARoles={puedeIrARoles}
            />
          </Suspense>
        </LimiteDeTarjeta>
      </TarjetasDeAjustes>
    </div>
  )
}
