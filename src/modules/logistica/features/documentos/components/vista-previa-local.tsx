'use client'

import { useState } from 'react'
import { Modal } from '@/shared/ui/modal'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { formaDelArchivo } from '../../../entities/documentos/vista-previa'
import type { EntradaDeLaBandeja } from '../hooks/use-bandeja'
import { useUrlLocal } from '../hooks/use-url-local'
import { ImagenConZoom } from './imagen-con-zoom'
import {
  CAJA_DE_LA_VISTA_PREVIA,
  Mensaje,
  muestraPdf,
  NO_HAY_VISTA_PREVIA,
  NO_SE_PUDO_MOSTRAR,
  SIN_VISOR_DE_PDF,
} from './visor-del-archivo'

type Props = {
  // El archivo de la bandeja que se mira (nulo = cerrada).
  entrada: EntradaDeLaBandeja | null
  cerrar: () => void
}

function ArchivoLocal({ entrada }: { entrada: EntradaDeLaBandeja }) {
  const { nombre, mime } = entrada.datos
  const forma = formaDelArchivo({ mime, nombre })
  const url = useUrlLocal(forma === 'otro' ? null : entrada.archivo)
  const [fallo, setFallo] = useState(false)
  if (forma === 'otro') return <Mensaje texto={NO_HAY_VISTA_PREVIA} />
  if (fallo) return <Mensaje texto={NO_SE_PUDO_MOSTRAR} />
  if (url === null) return <div className="size-full" aria-busy="true" />
  if (forma === 'imagen') {
    return (
      <ImagenConZoom
        url={url}
        alt={nombre}
        alFallar={() => {
          setFallo(true)
        }}
      />
    )
  }
  if (!muestraPdf()) return <Mensaje texto={SIN_VISOR_DE_PDF} />
  return <iframe src={url} title={nombre} className="size-full border-0" data-visor-de-pdf />
}

// La vista previa de un archivo que todavía no se subió: la misma caja y el mismo modal que la de un documento, pero sólo para ver (sin aprobar ni rechazar: aún no hay documento). Es local: no
// tiene URL ni pide nada al servidor, y se cierra al subir o quitar el archivo.
export function VistaPreviaLocal({ entrada, cerrar }: Props) {
  const ultima = useUltimo(entrada)
  return (
    <Modal
      abierto={entrada !== null}
      alCerrar={cerrar}
      titulo="Vista previa"
      ancho="grande"
      completoEnCelular
    >
      {ultima ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-vista-previa-local>
          <p className="min-h-[44px] truncate text-center font-medium" title={ultima.datos.nombre}>
            {ultima.datos.nombre}
          </p>
          <div className={CAJA_DE_LA_VISTA_PREVIA}>
            <ArchivoLocal key={ultima.datos.hash} entrada={ultima} />
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
