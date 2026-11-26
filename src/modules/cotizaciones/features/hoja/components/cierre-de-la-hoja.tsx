'use client'

import type { EleccionesDeLaHoja } from '../../../entities/obligatorios-al-cotizar'
import type { VistaDelGuardado } from '../hooks/use-nucleo-del-guardado'
import { AvisoDelGuardado } from './aviso-de-guardado'
import { BotonGuardar, type BotonDeGuardar } from './boton-guardar'
import { useRanuraDeGuardar } from './menu-de-la-guardada/use-ranura-de-guardar'
import { VistaPreviaConElTeclado } from './vista-previa-con-el-teclado'

export const TEXTO_DE_SOLO_LECTURA = 'Sólo lectura: no puedes guardar esta cotización.'

export type PropsDelCierre = {
  // Nulo: la hoja no guarda (una guardada de sólo lectura).
  boton: BotonDeGuardar | null
  soloLectura: boolean
  // El guardado que se ve (el de la nueva o el de la guardada que edita) y lo que su aviso necesita: la versión de la fórmula, «Recargar», «Cambios guardados.» de una
  // guardada y cómo se elige lo que falta.
  guardado: VistaDelGuardado | null
  version: number
  alRecargar: () => void
  confirmacion: string | null
  elecciones: EleccionesDeLaHoja | undefined
}

// El cierre de la hoja (`data-cierre-de-la-hoja`), a todo el ancho y justo debajo de «Avanzado» (o al final, sin él): «Guardar» con su motivo y lo que falta elegir
// y, en una región viva, lo que dijo el último guardado (`AvisoDelGuardado`: el conflicto con «Recargar», sin red, «Cambios guardados.»). En una guardada «Guardar»
// sube a la cabecera y aquí queda la región viva; quien sólo la ve lee P13 en la cabecera (no aquí: con el proveedor del «⋯» lo dibuja `CabeceraDeLaGuardada`).
// En la hoja nueva cierra con «Vista previa» para el teclado (`VistaPreviaConElTeclado`, se ve al enfocarla). Sin «Guardar» ni sólo lectura no hay cierre (lo decide
// quien lo arma: `hayCierre()`).
export function CierreDeLaHoja({ boton, soloLectura, guardado, ...aviso }: PropsDelCierre) {
  const enLaGuardada = useRanuraDeGuardar() !== undefined
  return (
    <div data-cierre-de-la-hoja="" className="grid min-w-0 gap-2">
      {boton !== null ? (
        <BotonGuardar {...boton} />
      ) : soloLectura && !enLaGuardada ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{TEXTO_DE_SOLO_LECTURA}</p>
      ) : null}
      <div role="status" className="grid gap-1">
        {guardado === null || boton === null ? null : (
          <AvisoDelGuardado guardado={guardado} alReintentar={boton.alGuardar} {...aviso} />
        )}
      </div>
      {enLaGuardada ? null : <VistaPreviaConElTeclado />}
    </div>
  )
}

// Si la hoja tiene cierre: con «Guardar», o en sólo lectura (P13 lo dice ahí si no hay cabecera de la guardada).
export const hayCierre = (p: Pick<PropsDelCierre, 'boton' | 'soloLectura'>) =>
  p.boton !== null || p.soloLectura
