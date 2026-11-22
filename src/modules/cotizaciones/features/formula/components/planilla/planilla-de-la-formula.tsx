'use client'

import { EstiloDeTonos } from '@/shared/ui/xcell'
import { AccionesEnLaBarra } from '../../../barra-de-la-formula/components'
import { useEstadoEnLaBarra } from '../../../barra-de-la-formula/hooks/use-estado-en-la-barra'
import { usePlanilla, type Planilla } from '../../hooks/use-planilla'
import { BarraDeFormula } from './barra/barra-de-formula'
import { GuardarBorrador } from './comunes/guardar-borrador'
import { RechazoDeArriba } from './comunes/rechazo-de-arriba'
import { CuadriculaDeLaPlanilla } from './cuadricula'
import { LeyendaDeTipos } from './menu/leyenda-de-tipos'
import { MenuDeLaPlanilla } from './menu/menu-de-la-planilla'
import { PanelesDeLaPlanilla } from './paneles/paneles-de-la-planilla'
import { TarjetaDeLaUnidad } from './tarjeta-de-la-unidad'
import type { PropsDeLaPlanilla } from './tipos'
import { TotalesDeLaUnidad } from './totales-de-la-unidad'

const SIN_TONOS: never[] = []

// Arriba de la planilla: sobre qué versión se edita, su «⋯», «Guardar el borrador» y cómo se escribe en ella.
function CabeceraDeLaPlanilla({ p, planilla }: { p: PropsDeLaPlanilla; planilla: Planilla }) {
  const { guardado } = p.editor
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{p.sobre}</p>
        <AccionesEnLaBarra orden={3}>
          <MenuDeLaPlanilla planilla={planilla} />
        </AccionesEnLaBarra>
      </div>
      <GuardarBorrador
        nombreDelOrigen={p.origen.nombre}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        avisoDelDiseno={guardado.avisoDelDiseno}
        recargando={p.recargando}
        alGuardar={() => {
          void guardado.guardar()
        }}
        alRecargar={p.alRecargar}
      />
      <p className="text-(length:--text-sm) text-(--color-ink)">
        Elige una celda y escribe, como en una hoja de cálculo: un número es un valor fijo y lo que
        empieza con «=» es un cálculo.
      </p>
    </>
  )
}

// La planilla de la fórmula (glosario: «Planilla de la fórmula»; la única forma de editarla): la fórmula de trabajo como una hoja de cálculo, con la leyenda de los
// tipos de celda y la barra de fórmula arriba, la cuadrícula (# · A concepto · B % · C valor · D de dónde sale) en bandas y, al costado cuando hay lugar (si no,
// debajo), «Totales» y la tarjeta en vivo con la unidad de ejemplo. Los paneles (bandas, total, tipo de celda, ayuda) viven en la URL.
export function PlanillaDeLaFormula(p: PropsDeLaPlanilla) {
  const { editor } = p
  const planilla = usePlanilla(p)
  // La barra de la fórmula dice el estado de lo que se edita.
  useEstadoEnLaBarra(editor.guardado.hayCambios ? { tipo: 'cambios' } : p.estadoGuardado)
  const tonos = planilla.bandas.tonos.estado
  return (
    <section aria-label="Planilla de la fórmula" className="@container/formula grid min-w-0 gap-3">
      <EstiloDeTonos tonos={tonos.tipo === 'listo' ? tonos.tonos : SIN_TONOS} />
      <CabeceraDeLaPlanilla p={p} planilla={planilla} />
      <RechazoDeArriba rechazo={editor.rechazo} />
      {/* Al costado sólo si la planilla tiene lugar (un contenedor, no la pantalla: con el texto al 200 % o la columna de Configuración, la cuadrícula no se aprieta). */}
      <div className="grid min-w-0 gap-4 @6xl/formula:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid min-w-0 content-start gap-3">
          <LeyendaDeTipos />
          <BarraDeFormula
            planilla={planilla}
            puedeCambiarTiposDeCambio={p.puedeCambiarTiposDeCambio}
          />
          <CuadriculaDeLaPlanilla planilla={planilla} nombreDelOrigen={p.origen.nombre} />
        </div>
        <aside aria-label="Totales y tarjeta" className="grid min-w-0 content-start gap-4">
          <TotalesDeLaUnidad
            lectura={editor.lectura}
            vista={planilla.calculo.vista}
            lineas={planilla.calculo.lineas}
            rechazo={editor.rechazo}
            nombreDelOrigen={p.origen.nombre}
            alReintentar={editor.reintentarLaLectura}
          />
          <TarjetaDeLaUnidad
            origenId={p.origen.id}
            formulaDelOrigenId={p.formulaDelOrigenId}
            tarjeta={p.tarjeta}
            TarjetaEnVivo={p.TarjetaEnVivo}
            vista={planilla.calculo.vista}
            modos={planilla.calculo.modos}
            modo={p.modo}
            alElegirModo={p.alElegirModo}
            verTotalBs={planilla.verTotalBs}
          />
        </aside>
      </div>
      <PanelesDeLaPlanilla planilla={planilla} origen={p.origen} tiposDeCambio={p.tiposDeCambio} />
    </section>
  )
}
