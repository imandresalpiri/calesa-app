import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirLaPestana } from '../abrir'
import { EsqueletoDeLaPestana } from '../esqueleto-de-la-pestana'
import { SeccionCotizador } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: 'Cotizador de repuestos' }

// Repuestos › Configuración › Cotizador: la fórmula, los tramos de logística y las cajas. Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso». Cada modal
// (`?panel=tramo|caja`) tiene su URL.
export default async function PaginaDelCotizadorDeRepuestos() {
  const oculto = await ocultoEnElLive('repuestos')
  if (oculto) {
    return oculto
  }
  const abierto = await abrirLaPestana()
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <Suspense fallback={<EsqueletoDeLaPestana etiqueta="Cargando el cotizador de repuestos" />}>
      <SeccionCotizador />
    </Suspense>
  )
}
