'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'

type Props = { abierto: boolean; alCerrar: () => void; titulo: string; children: ReactNode }

// El modal de «Ver como tabla»: la tabla de una gráfica del tablero, de sólo lectura. El cuerpo desplaza (hasta 90 filas).
export function ModalDeLaTabla({ abierto, alCerrar, titulo, children }: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`${titulo}: datos de la gráfica`}
      ancho="amplio"
      completoEnCelular
      pie={
        <Button type="button" variant="outline" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      {children}
    </Modal>
  )
}
