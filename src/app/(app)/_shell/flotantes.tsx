import type { ReactNode } from 'react'
import { CopiarElEnlaceDeLaPagina } from '@/shared/ui/copiar-el-enlace-de-la-pagina'

// Lo que flota abajo a la derecha de toda pantalla, en una fila: «Copiar el enlace de esta página» (secundario, más chico) a la izquierda de lo que llega
// (el botón del chat). Donde el chat no está (`/chat`, sin permiso de chat) el de copiar queda solo en ese lugar. Por debajo de los modales (`z-40` contra `z-50`) y, en
// el celular, sobre la navegación de abajo (`bottom-20`).
export function Flotantes({ children }: { children?: ReactNode }) {
  return (
    <div
      data-flotantes=""
      className="pointer-events-none fixed right-4 bottom-20 z-40 flex items-center gap-2 *:pointer-events-auto md:bottom-4"
    >
      <CopiarElEnlaceDeLaPagina />
      {children}
    </div>
  )
}
