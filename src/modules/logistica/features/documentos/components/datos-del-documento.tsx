'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { formatearBytes } from '../../../entities/documentos/tamano'
import { textoDelVencimiento } from '../../../entities/documentos/vencimiento'
import { Badge } from '@/shared/ui/badge'
import { EstadoDelDocumento } from './estado-del-documento'

const OTRA_PERSONA = 'otra persona'

type Nombres = Readonly<Record<string, string>>

function nombreDe(id: string | null, nombres: Nombres): string | null {
  return id ? (nombres[id] ?? OTRA_PERSONA) : null
}

// El estado en texto y el vencimiento («Vence el 3 mar 2027», «Vencido»): lo que la fila y la vista previa dicen primero.
export function EstadoYVencimiento({
  documento,
  hoy,
}: {
  documento: Pick<DocumentoDeLaUnidad, 'estado' | 'venceEl'>
  hoy: string
}) {
  const vencimiento = textoDelVencimiento(documento.venceEl, hoy)
  return (
    <>
      <EstadoDelDocumento estado={documento.estado} />
      {vencimiento ? (
        <Badge variant={vencimiento === 'Vencido' ? 'destructive' : 'outline'}>{vencimiento}</Badge>
      ) : null}
    </>
  )
}

// «Subido por Ana el 3 mar 2027. Revisado por Luis el 4 mar 2027»: sin nombre un uuid nunca se muestra (D8).
function Autoria({ documento, nombres }: { documento: DocumentoDeLaUnidad; nombres: Nombres }) {
  const { zonaHoraria } = useRegional()
  const subidoPor = nombreDe(documento.subidoPor, nombres)
  const revisadoPor = nombreDe(documento.revisadoPor, nombres)
  const fecha = (iso: string) => formatearFecha(iso, { zona: zonaHoraria })
  return (
    <p className="min-w-0 break-words">
      Subido{subidoPor ? ` por ${subidoPor}` : ''} el {fecha(documento.creadoEn)}
      {documento.revisadoEn
        ? `. Revisado${revisadoPor ? ` por ${revisadoPor}` : ''} el ${fecha(documento.revisadoEn)}`
        : ''}
    </p>
  )
}

// Lo que acompaña al archivo en la vista previa: estado, vencimiento, peso, el motivo del rechazo, quién lo subió y revisó y la nota. Va en una zona de alto reservado: lo que cambia de un
// documento a otro no mueve el modal.
export function DatosDelDocumento({
  documento,
  nombres,
  hoy,
}: {
  documento: DocumentoDeLaUnidad
  nombres: Nombres
  hoy: string
}) {
  return (
    <div
      className="grid min-h-[5.5rem] content-start gap-1.5 text-(length:--text-sm) text-(--color-ink-soft)"
      data-datos-del-documento
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <EstadoYVencimiento documento={documento} hoy={hoy} />
        {documento.bytes !== null ? <span>{formatearBytes(documento.bytes)}</span> : null}
      </div>
      {documento.estado === 'rechazado' && documento.motivoDeRechazo ? (
        <p className="text-destructive min-w-0 break-words">
          Rechazado: {documento.motivoDeRechazo}
        </p>
      ) : null}
      <Autoria documento={documento} nombres={nombres} />
      {documento.nota ? (
        <p className="min-w-0 break-words text-(--color-ink)">{documento.nota}</p>
      ) : null}
    </div>
  )
}
