import { Suspense } from 'react'
import { ZONA_POR_DEFECTO, diaEnZona, formatearDiaYMes } from '@/shared/lib/fechas'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { periodoDesde, ventanaDelPeriodo } from '../../../entities/periodo'
import { filasDesde } from '../../../entities/personalizar'
import {
  widgetsVisibles,
  type LiveDelTablero,
  type PreferenciaDeWidgets,
} from '../../../entities/widgets'
import { BotonPersonalizar } from '../personalizar/boton-personalizar'
import { widgetsParaMontar } from '../widgets/registro'
import { EsqueletoDeWidget } from './esqueleto-de-widget'
import { MarcoDeWidget } from './marco-de-widget'
import { MontajeDeWidget } from './montaje-de-widget'
import { SelectorDePeriodo } from './selector-de-periodo'

type Props = {
  permisos: Permisos
  // El valor crudo de `?periodo=`: uno desconocido cae en «Este mes».
  periodo?: unknown
  // La zona horaria de la empresa: de ella sale qué es «hoy».
  zona?: string
  // Lo que la persona eligió en «Personalizar» (`tablero.widgets`); sin elegir, el tablero como viene.
  preferencia?: PreferenciaDeWidgets | null
  // Con el Modo Live: sólo las métricas de cotizaciones, sin «Personalizar».
  live?: LiveDelTablero
}

const SIN_LIVE: LiveDelTablero = { encendido: false }

// Con el Modo Live y ningún widget que se vea (sus ajustes ocultan las cotizaciones): lo dice, en vez de «No tienes permiso».
function VacioEnElLive() {
  return (
    <div className="grid gap-5">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Tablero</h1>
      <EstadoVacio titulo="En el Modo Live, el Tablero muestra sólo las métricas de cotizaciones." />
    </div>
  )
}

// `/tablero`: las métricas del período, en widgets. Cada widget lee por su cuenta tras su `<Suspense>`:
// uno lento o caído no frena ni tumba a los demás. Se arma por permisos, nunca por nombre de rol.
export function PanelDelTablero({
  permisos,
  periodo,
  zona = ZONA_POR_DEFECTO,
  preferencia = null,
  live = SIN_LIVE,
}: Props) {
  const { mostrados: montajes, ocultos } = widgetsParaMontar(permisos, preferencia, live)
  if (montajes.length === 0 && ocultos.length === 0) {
    return live.encendido ? <VacioEnElLive /> : <EstadoSinPermiso />
  }
  const visibles = widgetsVisibles(permisos, live)
  const titulos = new Map<string, string>(visibles.map((widget) => [widget.clave, widget.titulo]))
  // Sólo se ofrece lo que la persona puede ver (los mismos `visibles` que arman el tablero).
  const ofrecidos = filasDesde(visibles, preferencia).map((fila) => ({
    ...fila,
    titulo: titulos.get(fila.clave) ?? fila.clave,
  }))
  const activo = periodoDesde(periodo)
  const ventana = ventanaDelPeriodo(activo, diaEnZona(new Date().toISOString(), { zona }))

  return (
    <div className="grid gap-5">
      <header className="grid gap-3">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Tablero</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SelectorDePeriodo activo={activo} />
          {live.encendido ? null : (
            <BotonPersonalizar
              ofrecidos={ofrecidos}
              hayPreferencia={preferencia !== null}
              ordenDeFabrica={visibles.map((widget) => widget.clave)}
            />
          )}
        </div>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {ventana.etiqueta}: del {formatearDiaYMes(ventana.desde)} al{' '}
          {formatearDiaYMes(ventana.hasta)}
        </p>
      </header>
      {montajes.length === 0 ? (
        <EstadoVacio
          titulo="Ocultaste todos los widgets"
          descripcion="Elige cuáles quieres ver en «Personalizar»."
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {montajes.map((montaje) => (
          <MarcoDeWidget key={montaje.widget.clave} widget={montaje.widget}>
            <Suspense
              fallback={
                <EsqueletoDeWidget alto={montaje.widget.tamano === 'ancho' ? 'grafica' : 'cifra'} />
              }
            >
              <MontajeDeWidget montaje={montaje} ventana={ventana} permisos={permisos} />
            </Suspense>
          </MarcoDeWidget>
        ))}
      </div>
    </div>
  )
}
