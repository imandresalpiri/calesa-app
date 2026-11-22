import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EsqueletoDeTipos, PantallaDeDocumentos } from '@/modules/flujos/pantallas/documentos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'

export const metadata: Metadata = { title: 'Tipos de documento' }

// Configuración › Catálogos › Tipos de documento: los de toda la empresa. Los cambia quien gestiona los catálogos de logística
// (`logistica.catalogos.gestionar`); quien configura un flujo los lee. Los de un flujo se configuran en el panel del flujo (la pestaña Fases del
// origen o el flujo de repuestos).
export default async function PaginaDeLosTiposDeDocumento() {
  const abierto = await abrirCatalogo('tipos-de-documento')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoDeTipos />}>
        <PantallaDeDocumentos permisos={abierto.sesion.permisos} grupos="empresa" />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
