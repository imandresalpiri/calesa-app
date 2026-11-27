import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirLaPestana } from '../abrir'
import { EsqueletoDeLaPestana } from '../esqueleto-de-la-pestana'
import { SeccionCatalogos } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: 'Catálogos de repuestos' }

// Repuestos › Configuración › Catálogos: los cuatro que se eligen en cada ítem. Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso».
export default async function PaginaDeCatalogosDeRepuestos() {
  const oculto = await ocultoEnElLive('repuestos')
  if (oculto) {
    return oculto
  }
  const abierto = await abrirLaPestana()
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <Suspense
      fallback={<EsqueletoDeLaPestana etiqueta="Cargando los catálogos de repuestos" bloques={4} />}
    >
      <SeccionCatalogos />
    </Suspense>
  )
}
