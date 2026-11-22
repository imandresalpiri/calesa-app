import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirLaPestana } from './abrir'
import { CATALOGOS_DE_LOGISTICA } from './catalogos-de-logistica'

// La página de un catálogo de logística en Logística › Configuración (`/logistica/configuracion/<clave>`): el catálogo, con el título y la frase que ya dice su pestaña.
// Cada sub-ruta es un `page.tsx` de una línea que trae su clave. Sin el permiso del catálogo, «No tienes permiso»; uno que el módulo no llena, «no encontrada».
// La base vuelve a exigir lo suyo en cada escritura.
export function metadataDeCatalogo(clave: string): Metadata {
  return { title: CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)?.titulo ?? 'Configuración' }
}

export async function PaginaDeUnCatalogo({ clave }: { clave: string }) {
  const catalogo = CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)
  if (catalogo === undefined) {
    notFound()
  }
  const abierto = await abrirLaPestana(clave)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const Catalogo = catalogo.componente
  return <Catalogo />
}
