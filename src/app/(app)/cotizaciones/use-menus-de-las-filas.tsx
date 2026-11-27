'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import type {
  CompartirDe,
  MenuDeFila,
  MenuDeUnaFila,
} from '@/modules/cotizaciones/pantallas/listado'
import { DialogoDeAprobarPrivada } from '@/modules/cotizaciones/pantallas/aprobada-listado'
import { DialogosDeMarcasDeLaFila } from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { DialogoDeMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import {
  DialogoDeCompartirDeLaFila,
  useAbrirCompartirDeLaFila,
} from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import { MenuDeLaFila } from './menu-de-la-fila'
import { useAccionesDeLaLista } from './use-acciones-de-la-lista'

type Fila = { id: string; numero: number }

// Lo que el listado y el resumen de una ficha comparten de las acciones de una cotización: el «⋯» de cada fila (`menuDeFila`), «Compartir» de la barra del resumen (`compartirDe`, nulo sin
// la oferta del «⋯»), el refresco tras aprobar desde «De este vehículo» y los diálogos del «⋯» montados una vez (compartir, marcar final, reportar y moderar:
// `?panel=…&para=<id>`). `filas` son las cotizaciones sobre las que se ofrece algo; `menus`, lo que el servidor leyó de cada una.
export function useMenusDeLasFilas(
  filas: readonly Fila[],
  menus: Readonly<Record<string, MenuDeUnaFila>>,
): {
  menuDeFila: MenuDeFila
  compartirDe: CompartirDe
  alCambiarLaAprobada: () => void
  dialogos: ReactNode
} {
  const acciones = useAccionesDeLaLista(filas, menus)
  const router = useRouter()
  const abrirCompartir = useAbrirCompartirDeLaFila()
  return {
    // «Compartir» de la tarjeta: lo que ofrece su «⋯», con el mismo panel.
    compartirDe: (fila) =>
      menus[fila.id]?.ofertas.compartir === undefined
        ? null
        : () => {
            abrirCompartir(fila.id)
          },
    // Aprobar desde «De este vehículo» del resumen cambia la insignia de otras filas: la pantalla no tiene nada tipeado y se refresca (como «Aprobar» del «⋯»).
    alCambiarLaAprobada: () => {
      router.refresh()
    },
    menuDeFila: (fila, opciones) => {
      const menu = menus[fila.id]
      return menu === undefined ? null : (
        <MenuDeLaFila
          cotizacion={fila}
          menu={menu}
          sinCompartir={opciones?.sinCompartir === true}
          conBorde={opciones?.conBorde === true}
          favorita={acciones.esFavorita(fila.id)}
          enCurso={acciones.enCurso(fila.id)}
          acciones={acciones.accionesDe(fila, menu)}
        />
      )
    },
    dialogos: (
      <>
        <DialogoDeCompartirDeLaFila />
        <DialogoDeMarcarFinalDeLaFila
          de={(id) => {
            const fila = filas.find((una) => una.id === id)
            const oferta = menus[id]?.ofertas.final
            return fila === undefined || oferta === undefined
              ? null
              : { numero: fila.numero, motivo: oferta.motivo, privada: menus[id]?.privada === true }
          }}
        />
        <DialogosDeMarcasDeLaFila datos={acciones.datosDeMarcas} />
        <DialogoDeAprobarPrivada
          desde="fila"
          de={(id) => {
            const fila = filas.find((una) => una.id === id)
            const menu = menus[id]
            return fila === undefined || menu?.ofertas.aprobar === undefined
              ? null
              : acciones.pedidoDeAprobar(fila, menu)
          }}
          focoAlCerrar={menuDeLaFila}
        />
      </>
    ),
  }
}

// El «⋯» de esa fila (la tabla y las tarjetas lo dibujan las dos: se busca el que se ve): a él vuelve el foco al cerrar la pregunta de aprobar una privada.
function menuDeLaFila(id: string): HTMLElement | boolean {
  const menus = document.querySelectorAll<HTMLElement>(`[data-mas-acciones="${id}"]`)
  return Array.from(menus).find((menu) => menu.offsetParent !== null) ?? true
}
