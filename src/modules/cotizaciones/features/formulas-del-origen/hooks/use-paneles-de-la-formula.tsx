'use client'

import type { ReactNode } from 'react'
import { rutaDeParteDelOrigen, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { menuDeLaFormulaDelOrigen } from '../../../entities/formulas-del-origen/menu'
import {
  CLAVE_DE_LA_FORMULA_DEL_PANEL,
  PANEL_ACTIVAR_FORMULA,
  PANEL_ARCHIVAR_FORMULA,
  PANEL_ELIMINAR_FORMULA,
  PANEL_RENOMBRAR_FORMULA,
} from '../../../entities/formulas-del-origen/rutas'
import {
  ConfirmarArchivarDiferido,
  ConfirmarEliminarDiferido,
  ModalDeActivarDiferido,
  ModalDeRenombrarDiferido,
} from '../components/diferidos'

export const MOTIVO_NO_ESTA = 'Esa fórmula ya no está en la lista: recarga para ver cómo quedó.'

// Un panel de una fórmula del origen por la URL (`?panel=<panel>&cual=<id>`): se revisa al llegar (una fórmula que no está en lo leído no se abre: se avisa y
// se limpia la URL) y cada apertura aceptada empieza de cero (`apertura`, la `key` de lo de adentro).
function usePanelDeLaFormula(panel: string, formulas: readonly FormulaDeLaLista[]) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_LA_FORMULA_DEL_PANEL])
  const id = url.valor(CLAVE_DE_LA_FORMULA_DEL_PANEL)
  const formula = formulas.find((f) => f.id === id) ?? null
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${panel}:${String(apertura)}` : null,
    formula === null ? MOTIVO_NO_ESTA : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada && formula !== null
  // Mientras se va (cerrado), conserva la fórmula que mostraba.
  const mostrada = useUltimo(abierto ? formula : null)
  return {
    nombre: panel,
    abierto,
    formula: mostrada,
    apertura,
    abrir: (formulaId: string) => {
      url.abrir({ [CLAVE_DE_LA_FORMULA_DEL_PANEL]: formulaId })
    },
    cerrar: url.cerrar,
  }
}

type Args = {
  origen: { id: string; nombre: string }
  // Las fórmulas que la barra conoce (las sin archivar, las archivadas leídas y la elegida): un panel sólo abre una de éstas.
  formulas: readonly FormulaDeLaLista[]
  activa: { id: string; nombre: string } | null
  // «Copiar»: abre «Nueva fórmula» con la copia.
  alCopiar: (formula: FormulaDeLaLista) => void
  // La fórmula elegida en la barra y la pestaña abierta: archivar o eliminar la elegida lleva a la pestaña con la de trabajo.
  elegidaId: string | null
  parte: ParteDeLaFormula
}

// Los cuatro paneles de una fórmula (Renombrar, Activar, Archivar y Eliminar), abiertos por la URL y montados de a uno (el último que se abrió), y el «⋯» de cada fórmula que
// los abre (`menuDeLaFormulaDelOrigen()`): el mismo en cada fila del selector de la barra.
export function usePanelesDeLaFormula({
  origen,
  formulas,
  activa,
  alCopiar,
  elegidaId,
  parte,
}: Args): {
  menuDe: (formula: FormulaDeLaLista) => AccionDeMenu[]
  paneles: ReactNode
} {
  const renombrar = usePanelDeLaFormula(PANEL_RENOMBRAR_FORMULA, formulas)
  const activar = usePanelDeLaFormula(PANEL_ACTIVAR_FORMULA, formulas)
  const archivar = usePanelDeLaFormula(PANEL_ARCHIVAR_FORMULA, formulas)
  const eliminar = usePanelDeLaFormula(PANEL_ELIMINAR_FORMULA, formulas)
  // Sólo el último panel que se abrió queda montado: un Confirmar cerrado que sigue montado deja trabado el siguiente que se abre en la misma
  // pantalla (Base UI no lo cierra al entrar). El último se conserva para que termine de irse.
  const ultimo = useUltimo(
    [renombrar, activar, archivar, eliminar].find((p) => p.abierto)?.nombre ?? null,
  )
  const menuDe = (formula: FormulaDeLaLista) =>
    menuDeLaFormulaDelOrigen(formula, {
      alRenombrar: () => renombrar.abrir(formula.id),
      alCopiar: () => alCopiar(formula),
      alActivar: () => activar.abrir(formula.id),
      alArchivar: () => archivar.abrir(formula.id),
      alEliminar: () => eliminar.abrir(formula.id),
    })
  const salirA = (formula: FormulaDeLaLista) =>
    formula.id === elegidaId ? rutaDeParteDelOrigen(origen.id, parte) : null
  const paneles = (
    <>
      {ultimo === renombrar.nombre && renombrar.formula ? (
        <ModalDeRenombrarDiferido
          key={renombrar.apertura}
          abierto={renombrar.abierto}
          alCerrar={renombrar.cerrar}
          origenId={origen.id}
          formula={renombrar.formula}
        />
      ) : null}
      {ultimo === activar.nombre && activar.formula ? (
        <ModalDeActivarDiferido
          key={activar.apertura}
          abierto={activar.abierto}
          alCerrar={activar.cerrar}
          origen={origen}
          formula={activar.formula}
          activa={activa}
        />
      ) : null}
      {ultimo === archivar.nombre && archivar.formula ? (
        <ConfirmarArchivarDiferido
          key={archivar.apertura}
          abierto={archivar.abierto}
          alCerrar={archivar.cerrar}
          origenId={origen.id}
          formula={archivar.formula}
          salirA={salirA(archivar.formula)}
        />
      ) : null}
      {ultimo === eliminar.nombre && eliminar.formula ? (
        <ConfirmarEliminarDiferido
          key={eliminar.apertura}
          abierto={eliminar.abierto}
          alCerrar={eliminar.cerrar}
          origenId={origen.id}
          formula={eliminar.formula}
          salirA={salirA(eliminar.formula)}
        />
      ) : null}
    </>
  )
  return { menuDe, paneles }
}
