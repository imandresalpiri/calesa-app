'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useVueltaDeLaRed } from '@/shared/ui/use-vuelta-de-la-red'
import type {
  CambioDePosicion,
  PosicionPendiente,
} from '../../../../entities/posiciones-del-diagrama'
import { useFasesDelDiagrama } from '../../hooks/use-fases-del-diagrama'
import type { useEscrituraDelLienzo } from './use-escritura-del-lienzo'

type Pendientes = ReadonlyMap<string, PosicionPendiente>

type Pedido = {
  escribir: ReturnType<typeof useEscrituraDelLienzo>
  setPendientes: Dispatch<SetStateAction<Pendientes>>
  // Un conflicto u otro rechazo: lo que se rechazó ya no vale, y la pila de deshacer tampoco (sus pasos parten de lo que se veía).
  alDescartar: () => void
}

const igual = (a: CambioDePosicion, b: CambioDePosicion) => a.x === b.x && a.y === b.y

// Con la versión que devolvió la escritura, si sigue siendo lo pendiente de esa fase; sin versión, se va cuando lo leído lo trae.
function marcarGuardadas(
  antes: Pendientes,
  lote: readonly CambioDePosicion[],
  version: string | null,
) {
  const despues = new Map(antes)
  for (const c of lote) {
    const p = despues.get(c.faseId)
    if (p && igual(p.cambio, c)) despues.set(c.faseId, { cambio: c, guardadaEn: version })
  }
  return despues
}

function quitarDelLote(antes: Pendientes, lote: readonly CambioDePosicion[]) {
  const despues = new Map(antes)
  for (const c of lote) {
    const p = despues.get(c.faseId)
    if (p && igual(p.cambio, c)) despues.delete(c.faseId)
  }
  return despues
}

// El envío de las posiciones del lienzo: todo lo que espera en un solo envío por la cola del lienzo (y lo que se movió mientras tanto, en el siguiente).
// Sin red, lo del lote vuelve a esperar (si no se movió otra vez) y se reintenta solo al volver; otro rechazo devuelve esas cajas a lo leído.
export function useEnvioDePosiciones({ escribir, setPendientes, alDescartar }: Pedido) {
  const fasesDelDiagrama = useFasesDelDiagrama()
  const proveedor = useRef(fasesDelDiagrama)
  const porEnviar = useRef(new Map<string, CambioDePosicion>())
  const enviando = useRef(false)
  const [sinRed, setSinRed] = useState(false)
  useEffect(() => {
    proveedor.current = fasesDelDiagrama
  }, [fasesDelDiagrama])

  function terminar(
    lote: readonly CambioDePosicion[],
    resultado: Awaited<ReturnType<typeof escribir>>,
  ) {
    if (resultado.ok) {
      setSinRed(false)
      setPendientes((antes) => marcarGuardadas(antes, lote, resultado.version))
      return true
    }
    if (resultado.motivo === 'sin-red') {
      for (const c of lote) if (!porEnviar.current.has(c.faseId)) porEnviar.current.set(c.faseId, c)
      setSinRed(true)
      return false
    }
    if (resultado.motivo === 'conflicto') {
      porEnviar.current = new Map()
      setPendientes(new Map())
      alDescartar()
      return false
    }
    setPendientes((antes) => quitarDelLote(antes, lote))
    alDescartar()
    return true
  }

  function enviar() {
    const escritor = proveedor.current
    if (enviando.current || porEnviar.current.size === 0 || !escritor) return
    const lote = [...porEnviar.current.values()]
    porEnviar.current = new Map()
    enviando.current = true
    // Un fallo inesperado (la action lanzó) cuenta como rechazo: el envío no queda trabado.
    void escribir((version) => escritor.guardarPosiciones(lote, version))
      .catch(() => ({ ok: false, motivo: 'rechazo' }) as const)
      .then((resultado) => {
        enviando.current = false
        if (terminar(lote, resultado)) enviar()
      })
  }

  const vuelta = useVueltaDeLaRed()
  const alVolverLaRed = useEffectEvent(() => {
    enviar()
  })
  useEffect(() => {
    if (vuelta > 0) alVolverLaRed()
  }, [vuelta])

  return {
    sinRed,
    esperar: (cambios: readonly CambioDePosicion[]) => {
      for (const c of cambios) porEnviar.current.set(c.faseId, c)
    },
    enviar,
  }
}
