'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { RUTAS } from '@/shared/lib/rutas'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { lineasDelOrigen } from '../../../entities/acciones-del-origen'
import {
  PANEL_ELIMINAR_ORIGEN,
  motivoParaNoEliminar,
  type OrigenConUso,
} from '../../../entities/origen'
import { useOrigenes } from '../hooks/use-origenes'
import { usePanelDeDatos } from './datos/use-panel-de-datos'
import { ConfirmarEliminarOrigenDiferido } from './diferidos'

// El «⋯» del encabezado de la página de un origen, arriba a la derecha: en el celular «Datos» primero; con `origenes.gestionar`, activar o desactivar (se hace y
// se ofrece «Deshacer») y eliminar (pide confirmar, con su `?panel=eliminar-origen`; sólo un origen sin uso). Sin ninguna línea no se dibuja.
export function MenuDelOrigen({
  origen,
  puedeGestionar,
}: {
  origen: OrigenConUso
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const datos = usePanelDeDatos()
  const conDatos = !useAlMenos(CORTE_DE_LA_TABLA)
  const ediciones = useOrigenes()
  const panel = usePanelPorUrl(PANEL_ELIMINAR_ORIGEN)
  // Eliminó: la pantalla se va sola a la lista. Cerrar el panel escribiría la URL justo después de esa navegación y la pisaría.
  const [salio, setSalio] = useState(false)
  // Con uso, la URL no abre nada (la línea también está apagada).
  const abierto = panel.abierto && motivoParaNoEliminar(origen) === null
  const montar = useAbiertoAlgunaVez(abierto)

  async function eliminar() {
    const resultado = await ediciones.eliminar(origen)
    if (resultado.ok) {
      setSalio(true)
      router.push(RUTAS.origenes as Route)
    } else {
      panel.cerrar()
    }
  }

  const lineas = lineasDelOrigen(origen, { conDatos, gestiona: puedeGestionar })
  const acciones = lineas.map((linea): AccionDeMenu => {
    if (linea.tipo !== 'accion') {
      return linea
    }
    if (linea.clave === 'datos') {
      return {
        ...linea,
        despuesDeCerrar: true,
        alElegir: () => {
          datos.abrir()
        },
      }
    }
    if (linea.clave === 'eliminar') {
      return {
        ...linea,
        destructiva: true,
        despuesDeCerrar: true,
        deshabilitada: linea.deshabilitada || ediciones.enCurso,
        alElegir: () => {
          panel.abrir()
        },
      }
    }
    return {
      ...linea,
      deshabilitada: ediciones.enCurso,
      alElegir: () => {
        void ediciones.cambiarActivo(origen, linea.clave === 'activar')
      },
    }
  })

  if (acciones.length === 0) {
    return null
  }
  return (
    <MasAcciones nombre={origen.nombre} acciones={acciones} conBorde>
      {montar ? (
        <ConfirmarEliminarOrigenDiferido
          origen={origen}
          abierto={abierto}
          enCurso={ediciones.enCurso || salio}
          alCerrar={panel.cerrar}
          alConfirmar={eliminar}
        />
      ) : null}
    </MasAcciones>
  )
}
