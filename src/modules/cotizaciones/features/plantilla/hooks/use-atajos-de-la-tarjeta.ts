'use client'

import { useAtajo, useAyudaDePantalla } from '@/shared/ui/atajos'
import { OPERACIONES_DE_LA_BARRA } from '../../../entities/plantilla/edicion/disponibilidad'
import type { AccionDelEditor } from '../../../entities/plantilla/edicion/reductor'
import { AYUDA_DE_LA_TARJETA } from '../../../entities/plantilla/ayuda-de-atajos'

// Los atajos del editor de la tarjeta que atiende la ventana mientras está montado (`ATAJOS` con `pantalla: 'tarjeta'`): combinar, separar e insertar filas y columnas,
// con Alt (que no choca con el navegador ni con el sistema) y por la misma acción que el botón, así que lo que no se puede dice por qué en la barra. Y suma sus
// atajos a la lista de «?». Apagados mientras se guarda.
export function useAtajosDeLaTarjeta(hacer: (accion: AccionDelEditor) => void, ocupado: boolean) {
  useAyudaDePantalla(AYUDA_DE_LA_TARJETA)
  const por = (clave: keyof typeof OPERACIONES_DE_LA_BARRA) => () => {
    hacer(OPERACIONES_DE_LA_BARRA[clave])
  }
  const activo = !ocupado
  useAtajo('combinarCeldas', por('combinar'), activo)
  useAtajo('separarCeldas', por('separar'), activo)
  useAtajo('insertarFilaAbajo', por('filaAbajo'), activo)
  useAtajo('insertarFilaArriba', por('filaArriba'), activo)
  useAtajo('insertarColumnaDerecha', por('columnaDerecha'), activo)
  useAtajo('insertarColumnaIzquierda', por('columnaIzquierda'), activo)
}
