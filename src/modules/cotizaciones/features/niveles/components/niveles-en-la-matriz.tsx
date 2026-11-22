'use client'

import type { ReactNode } from 'react'
import { alTopeDeNiveles, separarNiveles, type ListaDeNiveles } from '../../../entities/nivel'
import { useEliminarNivelPorUrl } from '../hooks/use-eliminar-nivel-por-url'
import { useModalDeNivel } from '../hooks/use-modal-de-nivel'
import { idDelMasDeNivel, useMenusDeNiveles } from '../hooks/use-menus-de-niveles'
import { useNiveles } from '../hooks/use-niveles'
import { CabezaDeNiveles, ErrorDeNiveles } from './cabeza-de-niveles'
import { MasAccionesDeNivelDiferido } from './diferidos'
import { PieDeNiveles } from './pie-de-niveles'
import { VentanasDeNiveles } from './ventanas-de-niveles'

// Lo que la matriz de Roles recibe para dibujar los niveles de acceso: el mismo tipo estructural que declara `equipo` (ningún módulo importa al otro).
export type HuecosDeNiveles = {
  cabeza: ReactNode
  menuDelNivel: (clave: string) => ReactNode
  pie: ReactNode
  ventanas: ReactNode
}

type Props = {
  // La lista que lee la página; nulo si no se pudo leer (la matriz sigue y sólo los niveles lo dicen).
  lista: ListaDeNiveles | null
  // `equipo.roles.gestionar`: sin él se lee y no se cambia nada (la base lo vuelve a exigir en cada RPC).
  puedeGestionar: boolean
  children: (huecos: HuecosDeNiveles) => ReactNode
}

const SIN_LISTA: HuecosDeNiveles = {
  cabeza: <ErrorDeNiveles />,
  menuDelNivel: () => null,
  pie: null,
  ventanas: null,
}

function ConLaLista({
  lista: inicial,
  puedeGestionar,
  children,
}: Props & { lista: ListaDeNiveles }) {
  const niveles = useNiveles(inicial)
  const { lista } = niveles
  const modal = useModalDeNivel(lista, puedeGestionar)
  const eliminacion = useEliminarNivelPorUrl(lista.niveles, puedeGestionar)
  const menus = useMenusDeNiveles(lista, niveles, puedeGestionar, {
    alRenombrar: modal.abrirRenombre,
    alPedirEliminar: eliminacion.abrir,
  })
  return children({
    cabeza: <CabezaDeNiveles fijos={separarNiveles(lista.niveles).fijos} />,
    menuDelNivel: (clave) => {
      const nivel = lista.niveles.find((uno) => uno.clave === clave)
      const acciones = nivel ? menus.get(clave) : undefined
      return nivel && acciones ? (
        <MasAccionesDeNivelDiferido
          nombre={nivel.nombre}
          acciones={acciones}
          id={idDelMasDeNivel(nivel.id)}
        />
      ) : null
    },
    pie: puedeGestionar ? (
      <PieDeNiveles
        alTope={alTopeDeNiveles(lista.niveles, lista.tope)}
        tope={lista.tope}
        alNuevo={modal.abrirNuevo}
      />
    ) : null,
    ventanas: <VentanasDeNiveles niveles={niveles} modal={modal} eliminacion={eliminacion} />,
  })
}

// Configuración › Roles: los niveles de acceso dentro de la matriz. Se crean, renombran, retiran y restauran; uno que alguna hoja nombra no se elimina, se
// retira (sigue filtrando lo que ya lo usa y no se ofrece en un diseño nuevo). Hasta el tope que dice la base —contando los retirados—; la lista no se
// pagina. Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la lista entera con el motivo de uso de cada nivel. Quien sólo lee
// (`equipo.roles.ver`) ve los niveles sin «⋯» ni «+ Nuevo nivel». La matriz es de `equipo`: esto le llega por una función hija (la ruta junta los dos módulos).
export function NivelesEnLaMatriz({ lista, puedeGestionar, children }: Props) {
  return lista ? (
    <ConLaLista lista={lista} puedeGestionar={puedeGestionar}>
      {children}
    </ConLaLista>
  ) : (
    children(SIN_LISTA)
  )
}
