'use client'

import { claveDePuerto } from '@/shared/lib/catalogos/propios'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import {
  leerPuertosDelOrigen,
  NO_SE_CARGARON_LOS_PUERTOS,
} from '../../../areas/transporte/composicion.client'
import {
  NOMBRE_DE_PUERTO,
  type PropsDelCatalogoDelOrigen,
} from '../../../entities/nucleo/catalogo-del-origen'
import {
  MENSAJE_PUERTO_YA_NO_ESTA,
  textoDeUso,
  TOPE_DE_CATALOGO_DE_TRANSPORTE,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { CatalogoDelOrigen } from '../../nucleo/components/catalogo-del-origen'
import type { ConfigDelCatalogo } from '../../nucleo/hooks/use-catalogo-del-origen'
import { useDrawerDelCatalogo } from '../../nucleo/hooks/use-drawer-del-catalogo'
import { guardarPuerto } from '../actions/guardar-puerto'
import { PANELES_DE_PUERTO } from '../hooks/paneles-del-catalogo'
import { ModalDePuertoDiferido } from './diferidos-de-modales'
import { filasDePuertos } from './filas-del-catalogo'

const CONFIG: ConfigDelCatalogo<PuertoDeCatalogo> = {
  leer: leerPuertosDelOrigen,
  mensajeDeLectura: NO_SE_CARGARON_LOS_PUERTOS,
  activar: (puerto, activo) =>
    enviarAccion(
      guardarPuerto({ id: puerto.id, actualizadoEn: puerto.actualizadoEn, cambios: { activo } }),
      'No se pudo guardar el puerto.',
    ),
  avisoActivado: 'Puerto activado.',
  avisoDesactivado: 'Puerto desactivado.',
  avisoDelUso: (puerto, uso) => textoDeUso(puerto.nombre, uso, false),
}

const claveDe = (puerto: PuertoDeCatalogo) => claveDePuerto(puerto.nombre, puerto.pais)

// El drawer «Puertos» de las fases de un origen (`?panel=puertos`, 6.08-1): los de ese origen y los compartidos con todos, que se crean, renombran, ordenan
// (con un número), activan y desactivan; no se eliminan. Escribir pide `logistica.catalogos.gestionar` en el origen (la action y, por RPC, la base).
export function PuertosDelOrigen({ origen, puedeCambiar }: PropsDelCatalogoDelOrigen) {
  const { datos, modal, montar, contexto } = useDrawerDelCatalogo({
    origen,
    puedeCambiar,
    config: CONFIG,
    paneles: PANELES_DE_PUERTO,
    nombre: NOMBRE_DE_PUERTO,
    yaNoEsta: MENSAJE_PUERTO_YA_NO_ESTA,
    claveDe,
  })
  return (
    <CatalogoDelOrigen
      prefijo="puerto"
      nombre={NOMBRE_DE_PUERTO}
      origen={origen.nombre}
      puedeCambiar={puedeCambiar}
      columnaDeUso="País y código"
      tope={TOPE_DE_CATALOGO_DE_TRANSPORTE}
      lectura={datos.lectura}
      filas={(lista) =>
        filasDePuertos(
          lista,
          {
            alEditar: modal.abrirEdicion,
            alActivar: (puerto, activo) => void datos.activar(puerto, activo),
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
        <ModalDePuertoDiferido
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
