'use client'

import { EstiloDeTonos } from '@/shared/ui/xcell'
import { AccionesEnLaBarra } from '../../../barra-de-la-formula/components'
import { useEstadoEnLaBarra } from '../../../barra-de-la-formula/hooks/use-estado-en-la-barra'
import { usePlanilla, type Planilla } from '../../hooks/use-planilla'
import { BarraDeFormula } from './barra/barra-de-formula'
import { GuardarBorrador } from './comunes/guardar-borrador'
import { RechazoDeArriba } from './comunes/rechazo-de-arriba'
import { CuadriculaDeLaPlanilla } from './cuadricula'
import { MenuDeLaPlanilla } from './menu/menu-de-la-planilla'
import { PanelesDeLaPlanilla } from './paneles/paneles-de-la-planilla'
import type { PropsDeLaPlanilla } from './tipos'

const SIN_TONOS: never[] = []

// Arriba de la planilla: sobre qué versión se edita, su «⋯» y «Guardar el borrador».
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
    </>
  )
}

// La planilla de la fórmula (glosario: «Planilla de la fórmula»; la única forma de editarla): la fórmula de trabajo como una hoja de cálculo a todo el ancho, con
// la barra de fórmula arriba y la cuadrícula (# · A concepto · B % · C valor · Ejemplo) en bandas. «Totales» y la tarjeta en vivo abren al costado
// (`?costado=`) desde la barra; los demás paneles (bandas, total, tipo de celda, ayuda) también viven en la URL.
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
      <BarraDeFormula planilla={planilla} puedeCambiarTiposDeCambio={p.puedeCambiarTiposDeCambio} />
      <CuadriculaDeLaPlanilla planilla={planilla} nombreDelOrigen={p.origen.nombre} />
      <PanelesDeLaPlanilla p={p} planilla={planilla} />
    </section>
  )
}
