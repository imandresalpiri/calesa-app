'use client'

import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import {
  leerNavierasDelOrigen,
  NO_SE_CARGARON_LAS_NAVIERAS,
} from '../../../areas/transporte/composicion.client'
import {
  NOMBRE_DE_NAVIERA,
  type PropsDelCatalogoDelOrigen,
} from '../../../entities/nucleo/catalogo-del-origen'
import {
  MENSAJE_NAVIERA_YA_NO_ESTA,
  textoDeUso,
  TOPE_DE_CATALOGO_DE_TRANSPORTE,
  type NavieraDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { CatalogoDelOrigen } from '../../nucleo/components/catalogo-del-origen'
import type { ConfigDelCatalogo } from '../../nucleo/hooks/use-catalogo-del-origen'
import { useDrawerDelCatalogo } from '../../nucleo/hooks/use-drawer-del-catalogo'
import { guardarNaviera } from '../actions/guardar-naviera'
import { PANELES_DE_NAVIERA } from '../hooks/paneles-del-catalogo'
import { ModalDeNavieraDiferido } from './diferidos-de-modales'
import { filasDeNavieras } from './filas-del-catalogo'

const CONFIG: ConfigDelCatalogo<NavieraDeCatalogo> = {
  leer: leerNavierasDelOrigen,
  mensajeDeLectura: NO_SE_CARGARON_LAS_NAVIERAS,
  activar: (naviera, activo) =>
    enviarAccion(
      guardarNaviera({ id: naviera.id, actualizadoEn: naviera.actualizadoEn, cambios: { activo } }),
      'No se pudo guardar la naviera.',
    ),
  avisoActivado: 'Naviera activada.',
  avisoDesactivado: 'Naviera desactivada.',
  avisoDelUso: (naviera, uso) => textoDeUso(naviera.nombre, uso, true),
}

const claveDe = (naviera: NavieraDeCatalogo) => claveDeCatalogo(naviera.nombre)

// El drawer «Navieras» de las fases de un origen (`?panel=navieras`, 6.08-1): las de ese origen y las compartidas con todos, que se crean, renombran,
// activan y desactivan; no se eliminan. Escribir pide `logistica.catalogos.gestionar` en el origen (la action y, por RPC, la base).
export function NavierasDelOrigen({ origen, puedeCambiar }: PropsDelCatalogoDelOrigen) {
  const { datos, modal, montar, contexto } = useDrawerDelCatalogo({
    origen,
    puedeCambiar,
    config: CONFIG,
    paneles: PANELES_DE_NAVIERA,
    nombre: NOMBRE_DE_NAVIERA,
    yaNoEsta: MENSAJE_NAVIERA_YA_NO_ESTA,
    claveDe,
  })
  return (
    <CatalogoDelOrigen
      prefijo="naviera"
      nombre={NOMBRE_DE_NAVIERA}
      origen={origen.nombre}
      puedeCambiar={puedeCambiar}
      columnaDeUso="Estado"
      tope={TOPE_DE_CATALOGO_DE_TRANSPORTE}
      lectura={datos.lectura}
      filas={(lista) =>
        filasDeNavieras(
          lista,
          {
            alEditar: modal.abrirEdicion,
            alActivar: (naviera, activo) => void datos.activar(naviera, activo),
          },
          contexto,
        )
      }
      alNuevo={() => {
        modal.abrirNuevo()
      }}
      alAbrir={modal.abrirEdicion}
      alReintentar={datos.reintentar}
    >
      {montar ? (
        <ModalDeNavieraDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={datos.recargar}
          origen={origen}
          paraInicial={modal.para}
        />
      ) : null}
    </CatalogoDelOrigen>
  )
}
