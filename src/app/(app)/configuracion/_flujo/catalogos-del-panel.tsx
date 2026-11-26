import { Suspense } from 'react'
import type { FlujoFijo } from '@/modules/flujos/pantallas/configuracion'
import {
  EsqueletoDeTipos,
  PantallaDeDocumentos,
  quienCambiaLosTipos,
} from '@/modules/flujos/pantallas/documentos'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { PANELES_DE_LOS_CATALOGOS, type PanelDeCatalogo } from '@/shared/lib/rutas'
import { CatalogosDelFlujo } from './catalogos-del-flujo'

type Props = {
  permisos: Permisos
  fijo: FlujoFijo
  // `?panel=` tal cual: sólo con `tipos-de-documento` se leen los tipos.
  panelPedido: string | undefined
}

const DE_REPUESTOS: readonly PanelDeCatalogo[] = ['tipos-de-documento']

// Los catálogos de la barra del flujo: en un origen, los cuatro (puertos, navieras, categorías de gasto y tipos de documento); en el flujo de repuestos, sólo
// los tipos (los otros son de un origen). Lo que cada uno deja cambiar lo decide aquí la primera llave (`puede()`) y otra vez la base. Los tipos son contenido
// de servidor y se leen sólo si la URL los pide; si no, va su esqueleto.
export async function CatalogosDelPanel({ permisos, fijo, panelPedido }: Props) {
  const origenId = 'origenId' in fijo ? fijo.origenId : null
  const origen = origenId === null ? null : await nombreDelOrigen(origenId)
  return (
    <CatalogosDelFlujo
      disponibles={origenId === null ? DE_REPUESTOS : PANELES_DE_LOS_CATALOGOS}
      origen={origen}
      puedeCambiar={origenId !== null && puede(permisos, 'logistica.catalogos.gestionar', origenId)}
      quien={quienCambiaLosTipos(permisos, fijo)}
    >
      <Suspense fallback={<EsqueletoDeTipos />}>
        {panelPedido === 'tipos-de-documento' ? (
          <PantallaDeDocumentos permisos={permisos} fijo={fijo} origenes={getOrigenes(true)} />
        ) : (
          <EsqueletoDeTipos />
        )}
      </Suspense>
    </CatalogosDelFlujo>
  )
}

// El nombre del origen de la pestaña, para «De <origen>» y «Sólo de <origen>». La lista viene de `getOrigenes(true)`, que la pantalla ya pidió (misma
// consulta en el request).
async function nombreDelOrigen(origenId: string): Promise<{ id: string; nombre: string } | null> {
  const origenes = datosO(await getOrigenes(true))
  const origen = origenes.find((o) => o.id === origenId)
  return origen ? { id: origen.id, nombre: origen.nombre } : null
}
