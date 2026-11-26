'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { aceptaDecimales } from '../../../../../entities/decimales-de-celda'
import {
  MENSAJE_DATO_SIN_NUMERO,
  MENSAJE_SIN_DECIMALES,
} from '../../../../../entities/formula/decimales-de-la-fila'
import { filaDe, type FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import { CLAVE_DE_LA_FILA_DEL_TIPO } from '../../../hooks/use-paneles-de-la-planilla'
import type { Planilla } from '../../../hooks/use-planilla'
import { FormularioDeDecimales } from './formulario-de-decimales'

// Por qué la fila no lleva «Decimales» (la abrió una URL: el «⋯» no lo ofrece), o nulo.
function motivoDeLaFila(planilla: Planilla, fila: FilaDeLaHoja): string | null {
  if (!aceptaDecimales(fila.nodo)) return MENSAJE_SIN_DECIMALES
  return planilla.noSonNumero.has(fila.nodo.id) ? MENSAJE_DATO_SIN_NUMERO : null
}

// «Decimales…» del «⋯» de la fila (`?panel=decimales&fila=<id>`): con cuántos decimales se muestra la celda. Aplicar cambia la fórmula de trabajo con
// `cambiarDecimales()` (se guarda y se publica como todo lo de la planilla); un rechazo queda en el panel con lo elegido.
export function PanelDeDecimales({ planilla }: { planilla: Planilla }) {
  const { decimales: panel } = planilla.paneles
  const { hoja } = planilla
  const id = panel.valor(CLAVE_DE_LA_FILA_DEL_TIPO)
  const numero = id === null ? undefined : hoja.numeroDe.get(id)
  const fila = numero === undefined ? undefined : filaDe(hoja, numero)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(panel.abierto)
  if (panel.abierto !== antes) {
    setAntes(panel.abierto)
    if (panel.abierto) {
      setApertura((n) => n + 1)
      setMotivo(null)
    }
  }
  const sinDecimales = fila === undefined ? null : motivoDeLaFila(planilla, fila)
  return (
    <Drawer
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo="Decimales"
      {...(fila === undefined
        ? {}
        : { descripcion: `C${String(fila.numero)} · ${fila.nodo.etiqueta}` })}
    >
      {!panel.abierto ? null : fila === undefined ? (
        <p>Esa fila ya no está en la fórmula.</p>
      ) : sinDecimales !== null ? (
        <p>{sinDecimales}</p>
      ) : (
        <FormularioDeDecimales
          key={apertura}
          nodo={fila.nodo}
          motivo={motivo}
          alAplicar={(decimales) => {
            const m = planilla.ops.cambiarDecimales(fila.numero, decimales)
            if (m !== null) return void setMotivo(m)
            panel.cerrar()
            planilla.cuadricula.elegir({ id: fila.id, col: 'C' })
            planilla.enfocar()
          }}
          alCancelar={panel.cerrar}
        />
      )}
    </Drawer>
  )
}
