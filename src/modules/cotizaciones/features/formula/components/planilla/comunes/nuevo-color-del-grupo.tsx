'use client'

import { useState, type ComponentType } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ColorCreado, PropsDelNuevoColor } from '../../../../../entities/nuevo-color'
import type { EstadoDeLosTonos } from '../../../hooks/use-tonos'

// `?color=nuevo`: una clave propia, porque `?panel=` ya lo ocupa el panel de la banda (el modal se abre sobre él y cerrarlo no lo toca).
export const CLAVE_DEL_COLOR = 'color'
export const COLOR_NUEVO = 'nuevo'

type Props = {
  NuevoColor: ComponentType<PropsDelNuevoColor>
  tonos: EstadoDeLosTonos
  // El selector «Color», que recibe el foco al cerrar.
  idDelSelector: string
  alCrear: (color: ColorCreado) => void
}

// «+ Nuevo color» bajo el selector de color de una banda: abre «Nuevo color» (`?color=nuevo`, el modal del área `diseno` por el hueco), que lo crea en el catálogo
// y lo deja elegido. Espera a que los colores estén leídos (con ellos dice el nombre repetido y el tope antes de enviar). El modal se pide al abrirse por primera
// vez y lleva `key` por apertura: cada una empieza de cero, con un intento nuevo.
export function NuevoColorDelGrupo({ NuevoColor, tonos, idDelSelector, alCrear }: Props) {
  const panel = usePanelPorUrl(COLOR_NUEVO, [], { clave: CLAVE_DEL_COLOR })
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(panel.abierto)
  if (panel.abierto !== antes) {
    setAntes(panel.abierto)
    if (panel.abierto) setApertura((n) => n + 1)
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start md:min-h-9"
        disabled={tonos.tipo !== 'listo'}
        aria-expanded={panel.abierto}
        onClick={() => {
          panel.abrir()
        }}
      >
        <span aria-hidden>+ </span>Nuevo color
      </Button>
      {montar && tonos.tipo === 'listo' ? (
        <NuevoColor
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          existentes={tonos.tonos.map((t) => ({ id: t.clave, nombre: t.nombre }))}
          alCrear={alCrear}
          focoAlCerrar={() => document.getElementById(idDelSelector) ?? true}
        />
      ) : null}
    </>
  )
}
