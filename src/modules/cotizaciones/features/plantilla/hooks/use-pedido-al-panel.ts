'use client'

import { useEffect, type RefObject } from 'react'

// Lo que el lienzo o la barra le piden al panel de la celda al abrirlo: `foco` (Enter o F2 sobre un dato, el logo o un texto con datos: el campo de «Contenido» o el del
// texto), `texto` o `dato` (el «Insertar» de la barra: pone ese tipo de contenido en lo elegido y enfoca su campo). `vez` distingue un pedido de otro.
export type PedidoAlPanel = { vez: number; tipo: 'foco' | 'texto' | 'dato' }

const NOMBRE_DEL_TIPO = { texto: 'Texto', dato: 'Dato' } as const
const REINTENTOS = 30

// Atiende el pedido cuando el panel ya dibujó «Contenido» (llega por `diferido()` y tras abrirse el cajón): elige el tipo con el mismo botón que tocaría la persona, enfoca
// y avisa que lo atendió (`alAtender`), para que no se repita al volver a dibujar. `enfoque` es el grupo de «Contenido».
export function usePedidoAlPanel(
  pedido: PedidoAlPanel | null,
  enfoque: RefObject<HTMLDivElement | null>,
  alAtender: () => void,
): void {
  useEffect(() => {
    if (pedido === null) return
    let intentos = 0
    let marco = 0
    const enfocar = (grupo: HTMLElement) => {
      const texto = grupo.parentElement?.querySelector<HTMLElement>('[data-campo-del-texto]')
      const elegido = grupo.querySelector<HTMLElement>('[aria-checked="true"]')
      ;(pedido.tipo === 'dato' ? (elegido ?? grupo) : (texto ?? elegido ?? grupo)).focus()
      alAtender()
    }
    const intentar = () => {
      const grupo = enfoque.current
      if (grupo === null) {
        if (intentos++ < REINTENTOS) marco = requestAnimationFrame(intentar)
        // Sin «Contenido» (el panel de una fila, nada elegido): el pedido no queda esperando para otra apertura.
        else alAtender()
        return
      }
      if (pedido.tipo !== 'foco') {
        const nombre = NOMBRE_DEL_TIPO[pedido.tipo]
        const boton = [...grupo.querySelectorAll<HTMLElement>('[role="radio"]')].find(
          (b) => b.textContent.trim() === nombre,
        )
        if (boton !== undefined && boton.getAttribute('aria-checked') !== 'true') boton.click()
      }
      // Un cuadro más: con el tipo ya elegido, su campo existe.
      marco = requestAnimationFrame(() => {
        enfocar(grupo)
      })
    }
    marco = requestAnimationFrame(intentar)
    return () => {
      cancelAnimationFrame(marco)
    }
  }, [pedido, enfoque, alAtender])
}
