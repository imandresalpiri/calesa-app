import type { Metadata } from 'next'
import { PantallaDeDocumentos } from '@/modules/flujos/pantallas/documentos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirLaPestana } from '../abrir'
import { CLAVE_DE_TIPOS_DE_DOCUMENTO } from '../pestanas'

export const metadata: Metadata = { title: 'Tipos de documento' }

// Logística › Configuración › Tipos de documento: los compartidos. Los cambia quien gestiona los catálogos de logística (`logistica.catalogos.gestionar`; la base lo pide en
// cada origen que los usa); quien configura un flujo o los repuestos los lee, de sólo lectura. Los de un flujo se configuran en el panel del flujo (la pestaña Fases
// del origen o el flujo de repuestos), donde también se ven los compartidos que tapa.
export default async function PaginaDeLosTiposDeDocumento() {
  const abierto = await abrirLaPestana(CLAVE_DE_TIPOS_DE_DOCUMENTO)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return <PantallaDeDocumentos permisos={abierto.sesion.permisos} grupos="empresa" />
}
