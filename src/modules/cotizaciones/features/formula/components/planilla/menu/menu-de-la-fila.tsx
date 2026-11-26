'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { aceptaDecimales } from '../../../../../entities/decimales-de-celda'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import { ESPERA_A_LA_FILA } from '../../../hooks/use-guardar-borrador.soporte'
import type { Planilla } from '../../../hooks/use-planilla'
import { ConMotivo, RENGLON, SubmenuDeLaBanda, SubmenuDelTipo } from './submenus-de-la-fila'

type Props = { planilla: Planilla; fila: FilaDeLaHoja }

type Accion = () => void

// Lo que se hace sobre la fila y vuelve a la grilla (el foco, no al «⋯»).
function enLaGrillaCon(planilla: Planilla, alElegir: (a: Accion) => void) {
  return (accion: Accion) => {
    alElegir(() => {
      accion()
      planilla.enfocar()
    })
  }
}

// «Mover arriba» y «Mover abajo» (Alt+↑ y Alt+↓), apagados en la primera y en la última.
function RenglonesDeMover({
  planilla,
  n,
  enLaGrilla,
}: {
  planilla: Planilla
  n: number
  enLaGrilla: (a: Accion) => void
}) {
  const { ops } = planilla
  return (
    <>
      <DropdownMenuItem
        className={RENGLON}
        disabled={n === 1}
        onClick={() => {
          enLaGrilla(() => {
            ops.mover(n, { antesDe: n - 1 })
          })
        }}
      >
        Mover arriba
        <DropdownMenuShortcut>Alt+↑</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem
        className={RENGLON}
        disabled={n === planilla.hoja.filas.length}
        onClick={() => {
          enLaGrilla(() => {
            ops.mover(n, { despuesDe: n + 1 })
          })
        }}
      >
        Mover abajo
        <DropdownMenuShortcut>Alt+↓</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  )
}

// «Decimales…» (su panel, `?panel=decimales`): sólo en una celda que se ve como número; mientras la fila espera a guardarse, apagado con su motivo.
function RenglonDeDecimales({
  planilla,
  fila,
  alElegir,
}: Props & { alElegir: (a: Accion) => void }) {
  if (!aceptaDecimales(fila.nodo) || planilla.noSonNumero.has(fila.nodo.id)) return null
  const motivo = planilla.editor.libre ? null : ESPERA_A_LA_FILA
  return (
    <DropdownMenuItem
      className={RENGLON}
      disabled={motivo !== null}
      onClick={() => {
        alElegir(() => {
          planilla.paneles.decimales.abrir({ fila: fila.id })
        })
      }}
    >
      <ConMotivo texto="Decimales…" motivo={motivo} />
    </DropdownMenuItem>
  )
}

function Renglones({ planilla, fila, alElegir }: Props & { alElegir: (a: Accion) => void }) {
  const { ops } = planilla
  const n = fila.numero
  const enLaGrilla = enLaGrillaCon(planilla, alElegir)
  const motivo = ops.motivoParaEliminar(n)
  return (
    <>
      <DropdownMenuItem
        className={RENGLON}
        onClick={() => {
          alElegir(() => {
            ops.insertar(n, 'arriba')
          })
        }}
      >
        Insertar arriba
      </DropdownMenuItem>
      <DropdownMenuItem
        className={RENGLON}
        onClick={() => {
          alElegir(() => {
            ops.insertar(n, 'abajo')
          })
        }}
      >
        Insertar abajo
      </DropdownMenuItem>
      <DropdownMenuItem
        className={RENGLON}
        onClick={() => {
          enLaGrilla(() => {
            ops.duplicar(n)
          })
        }}
      >
        Duplicar
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <RenglonesDeMover planilla={planilla} n={n} enLaGrilla={enLaGrilla} />
      <DropdownMenuSeparator />
      <SubmenuDelTipo planilla={planilla} fila={fila} alElegir={alElegir} />
      <RenglonDeDecimales planilla={planilla} fila={fila} alElegir={alElegir} />
      <SubmenuDeLaBanda planilla={planilla} fila={fila} alElegir={alElegir} />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={RENGLON}
        variant="destructive"
        disabled={motivo !== null}
        onClick={() => {
          enLaGrilla(() => {
            ops.eliminar(n)
          })
        }}
      >
        <ConMotivo texto="Eliminar" motivo={motivo} />
      </DropdownMenuItem>
    </>
  )
}

// El «⋯» de la fila activa (D21): uno solo en toda la planilla, arriba a la derecha de su D. Lo abren también el clic derecho, la tecla de menú y Shift+F10
// (`planilla.menu`). Lo elegido corre cuando el menú terminó de cerrarse: abrir una celda o un panel antes perdería el foco contra el «⋯»; y con algo elegido
// el menú no devuelve el foco al «⋯» (lo pone lo elegido).
export function MenuDeLaFila({ planilla, fila }: Props) {
  const [pendiente, setPendiente] = useState<Accion | null>(null)
  const devolverElFoco = useRef(true)
  const { menu } = planilla
  return (
    <DropdownMenu
      open={menu.abierto}
      onOpenChange={(abierto) => {
        if (abierto) {
          setPendiente(null)
          devolverElFoco.current = true
        }
        menu.alCambiar(abierto)
      }}
      onOpenChangeComplete={(abierto) => {
        if (abierto || pendiente === null) return
        setPendiente(null)
        pendiente()
      }}
    >
      <DropdownMenuTrigger
        data-menu-de-la-fila=""
        aria-label={`Acciones de la fila ${String(fila.numero)}`}
        className="absolute top-1/2 right-1 flex size-[44px] -translate-y-1/2 items-center justify-center rounded-(--radius-md) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:pointer-fine:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 max-w-(--available-width)"
        finalFocus={() => devolverElFoco.current}
      >
        <Renglones
          planilla={planilla}
          fila={fila}
          alElegir={(accion) => {
            devolverElFoco.current = false
            setPendiente(() => accion)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
