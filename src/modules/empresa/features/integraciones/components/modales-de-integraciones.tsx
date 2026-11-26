'use client'

import type { Integracion } from '../../../entities/integraciones'
import type { PanelesDeIntegraciones } from '../hooks/use-paneles-de-integraciones'
import {
  ModalDeApibaraDiferido,
  ModalDeAsistenteIaDiferido,
  ModalDeIndicacionesDelAsistenteDiferido,
  ModalDeSecretoDiferido,
  ModalDeWebPublicaDiferido,
} from './diferidos-de-integraciones'

type Props = {
  apibara: Integracion
  webPublica?: Integracion | undefined
  asistente?: Integracion | undefined
  paneles: PanelesDeIntegraciones
}

// Los modales del asistente de IA: el proveedor, el prompt base y los atajos, y la clave.
function ModalesDelAsistente({
  asistente,
  paneles,
}: {
  asistente: Integracion
  paneles: PanelesDeIntegraciones
}) {
  return (
    <>
      {paneles.asistente.montar ? (
        <ModalDeAsistenteIaDiferido
          abierto={paneles.asistente.abierto}
          alCerrar={paneles.cerrar}
          integracion={asistente}
        />
      ) : null}
      {paneles.indicaciones.montar ? (
        <ModalDeIndicacionesDelAsistenteDiferido
          abierto={paneles.indicaciones.abierto}
          alCerrar={paneles.cerrar}
          integracion={asistente}
        />
      ) : null}
      {paneles.claveAsistente.montar ? (
        <ModalDeSecretoDiferido
          abierto={paneles.claveAsistente.abierto}
          alCerrar={paneles.cerrar}
          integracion={asistente}
          clave="asistente_ia"
        />
      ) : null}
    </>
  )
}

// Los modales de Integraciones, cada uno recién cuando se abre por primera vez.
export function ModalesDeIntegraciones({ apibara, webPublica, asistente, paneles }: Props) {
  return (
    <>
      {paneles.apibara.montar ? (
        <ModalDeApibaraDiferido
          abierto={paneles.apibara.abierto}
          alCerrar={paneles.cerrar}
          integracion={apibara}
        />
      ) : null}
      {paneles.claveApibara.montar ? (
        <ModalDeSecretoDiferido
          abierto={paneles.claveApibara.abierto}
          alCerrar={paneles.cerrar}
          integracion={apibara}
          clave="apibara"
        />
      ) : null}
      {webPublica && paneles.webPublica.montar ? (
        <ModalDeWebPublicaDiferido
          abierto={paneles.webPublica.abierto}
          alCerrar={paneles.cerrar}
          integracion={webPublica}
        />
      ) : null}
      {webPublica && paneles.secretoWeb.montar ? (
        <ModalDeSecretoDiferido
          abierto={paneles.secretoWeb.abierto}
          alCerrar={paneles.cerrar}
          integracion={webPublica}
          clave="web_publica"
        />
      ) : null}
      {asistente ? <ModalesDelAsistente asistente={asistente} paneles={paneles} /> : null}
    </>
  )
}
