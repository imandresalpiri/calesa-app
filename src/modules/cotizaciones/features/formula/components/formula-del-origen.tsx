'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ComponentType } from 'react'
import type { CatalogoDeTablas } from '../../../entities/compilador'
import { estadoDeLaFormulaGuardada } from '../../../entities/formula/estado-de-la-edicion'
import { mismaVersion, otraSesion, type SobreQueVersion } from '../../../entities/formula/sesion'
import type { LecturaDeLaFormula as Formula } from '../../../entities/formula/versiones'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../entities/tarjeta-en-vivo'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { useAvisosDeLaCopia } from '../hooks/use-avisos-de-la-copia'
import { AccionesDeLaFormula } from './acciones-de-la-formula'
import { SesionDeLaFormulaDiferida } from './diferidos'
import type { TipoDeCambioDeLaEmpresa } from './planilla/tipos'
import type { PropsDelNuevoColor } from '../../../entities/nuevo-color'
import { AccionesDeLaVersion } from './acciones-de-la-version'
import { InformacionDeLaFormula } from './informacion'
import { VersionesDeLaFormula } from './versiones/versiones-de-la-formula'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  // La fórmula del origen que se edita: va en la `key` de la sesión, para que otra fórmula no herede lo suyo.
  formulaDelOrigenId: string
  formula: Formula
  tarjeta: LecturaDeLaTarjetaEnVivo
  // Las tablas que BUSCARV puede nombrar; null si no se pudieron leer.
  tablas: CatalogoDeTablas
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  puedeCambiarTiposDeCambio: boolean
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
}

// Sobre qué versión se edita: el borrador o, sin él, la publicada.
const sobreQue = (formula: Formula) =>
  formula.borrador
    ? `Sobre el borrador de ${formula.borrador.autor}.`
    : `Sobre la versión ${String(formula.publicada?.version ?? '')} publicada.`

// La pestaña «Planilla» de la Fórmula de un origen (Configuración › Orígenes): la planilla de la fórmula al frente, sobre el borrador o, sin él, la publicada. La
// información de la versión (la publicada, el borrador y los avisos de la copia) va en el modal «Información de la fórmula» (`?panel=info-formula`), que abre el
// botón ⓘ junto al estado de la barra, con su marca si algo bloquea; las versiones, en el drawer «Versiones». Desde el borrador al día se publica
// (`?panel=publicar-formula`; «Publicar…» espera mientras haya cambios aplicados sin guardar: se publica lo guardado), desde una archivada se revierte
// (`?panel=revertir-formula&version=<id>`) y el borrador se descarta desde el modal (`?panel=descartar-borrador`). La `key` de la sesión no lleva la versión (C8):
// guardar sobre la publicada crea el borrador y la sesión sigue montada; la vuelven a montar «Recargar» tras un conflicto (en la misma transición que trae la
// pestaña) y una versión que cambió por otra cosa (`otraSesion()`: publicar, descartar, revertir).
export function FormulaDelOrigen({
  origen,
  formulaDelOrigenId,
  formula,
  tarjeta,
  tablas,
  TarjetaEnVivo,
  NuevoColor,
  puedeCambiarTiposDeCambio,
  tiposDeCambio,
}: Props) {
  const panel = usePanelDeLaFormula()
  const avisos = useAvisosDeLaCopia(formulaDelOrigenId)
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [pendientes, setPendientes] = useState(false)
  const [recargando, recargarPagina] = useTransition()
  const sobre = formula.borrador ?? formula.publicada
  const version: SobreQueVersion | null =
    sobre === null ? null : { tipo: formula.borrador ? 'borrador' : 'publicada', id: sobre.id }
  // La versión sobre la que se edita cambió por algo que no hizo la sesión (publicar, descartar, revertir): otra sesión, sobre la nueva.
  const [generacion, setGeneracion] = useState({ version, sesion: 0 })
  if (!mismaVersion(generacion.version, version)) {
    setGeneracion({
      version,
      sesion: generacion.sesion + (otraSesion(generacion.version, version) ? 1 : 0),
    })
  }
  const recargar = () => {
    recargarPagina(() => {
      router.refresh()
      setVuelta((v) => v + 1)
    })
  }
  return (
    <div className="grid min-w-0 gap-4">
      <AccionesDeLaVersion
        origen={origen.nombre}
        formula={formula}
        avisos={avisos}
        alPublicar={panel.abrirPublicar}
        espera={pendientes}
      />
      <VersionesDeLaFormula origenId={origen.id} formula={formula} panel={panel} />
      {sobre ? (
        <SesionDeLaFormulaDiferida
          key={`${formulaDelOrigenId}:${String(vuelta)}:${String(generacion.sesion)}`}
          origen={origen}
          formulaDelOrigenId={formulaDelOrigenId}
          formulaId={sobre.id}
          sobre={sobreQue(formula)}
          estadoGuardado={estadoDeLaFormulaGuardada(formula)}
          recargando={recargando}
          alRecargar={recargar}
          alCambiarPendientes={setPendientes}
          tarjeta={tarjeta}
          tablas={tablas}
          TarjetaEnVivo={TarjetaEnVivo}
          NuevoColor={NuevoColor}
          puedeCambiarTiposDeCambio={puedeCambiarTiposDeCambio}
          tiposDeCambio={tiposDeCambio}
        />
      ) : null}
      <InformacionDeLaFormula
        origen={origen}
        formulaDelOrigenId={formulaDelOrigenId}
        formula={formula}
        avisos={avisos}
        alDescartar={panel.abrirDescartar}
      />
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </div>
  )
}
