'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ColorCreado } from '../../../../entities/nuevo-color'
import type { TonoDelCatalogo } from '../aspecto'
import { NuevoColorAlVueloDiferido } from './diferidos'

// `?color=nuevo`: una clave propia, porque `?panel=` lo usan otros paneles de la pestaña (el modal se abre sobre el inspector y cerrarlo no lo toca).
const CLAVE_DEL_COLOR = 'color'
const COLOR_NUEVO = 'nuevo'

type Props = {
  // Los colores que ya hay (para decir el nombre repetido y el tope antes de enviar).
  catalogo: readonly TonoDelCatalogo[]
  // El selector «Color» de la sección, que recibe el foco al cerrar.
  idDelSelector: string
  ocupado: boolean
  alCrear: (color: ColorCreado) => void
}

// «+ Nuevo color» bajo el selector de color de una sección, en el inspector de la hoja: abre «Nuevo color» (`?color=nuevo`), que lo crea en el catálogo; quien
// lo monta lo deja elegido. El modal se pide al abrirse por primera vez y lleva `key` por apertura: cada una empieza de cero, con un intento nuevo.
export function NuevoColorDeLaSeccion({ catalogo, idDelSelector, ocupado, alCrear }: Props) {
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
        size="sm"
        className="min-h-11 justify-self-start md:min-h-8"
        disabled={ocupado}
        aria-expanded={panel.abierto}
        onClick={() => {
          panel.abrir()
        }}
      >
        <span aria-hidden>+ </span>Nuevo color
      </Button>
      {montar ? (
        <NuevoColorAlVueloDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          existentes={catalogo.map((t) => ({ id: t.clave, nombre: t.nombre }))}
          alCrear={alCrear}
          focoAlCerrar={() => document.getElementById(idDelSelector) ?? true}
        />
      ) : null}
    </>
  )
}
