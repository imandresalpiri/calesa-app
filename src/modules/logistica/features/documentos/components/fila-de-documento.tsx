'use client'

import { AbrirResumen, MasAcciones, TarjetaDeLista } from '@/shared/ui/lista'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { formatearBytes } from '../../../entities/documentos/tamano'
import { extensionDelArchivo } from '../../../entities/documentos/vista-previa'
import { useAccionesDeLaFila } from '../hooks/use-acciones-de-la-fila'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { EstadoYVencimiento } from './datos-del-documento'
import { MiniaturaDelDocumento } from './miniatura-del-documento'

type Props = {
  documento: DocumentoDeLaUnidad
  // El tipo del documento: `null` en «Otro tipo» (el que ya no está entre los activos).
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
  hoy: string
}

// Un documento de la unidad en una línea: su miniatura, su nombre, su estado y vencimiento en texto, el motivo si lo rechazaron y sólo su «⋯» con todas las acciones (`lineasDelMenu`). Tocar la fila
// abre su vista previa (`<AbrirResumen>` es su botón «Ver <nombre>»; el «⋯» va aparte: un interactivo no va dentro de otro). Sin archivo no hay vista previa y la fila no se toca.
export function FilaDeDocumento({ documento, tipo, contexto, hoy }: Props) {
  const nombre = documento.nombre ?? 'Documento sin nombre'
  const { acciones, conflicto, error } = useAccionesDeLaFila(documento, tipo, contexto)
  const peso = documento.bytes !== null ? ` · ${formatearBytes(documento.bytes)}` : ''
  const conArchivo = documento.ruta !== null
  const textoDelNombre = <span className="min-w-0 font-medium break-words">{nombre}</span>
  return (
    <TarjetaDeLista
      alAbrir={
        conArchivo
          ? () => {
              contexto.alVer(documento.id)
            }
          : undefined
      }
      acciones={
        acciones.length > 0 ? <MasAcciones nombre={nombre} acciones={acciones} /> : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-3" data-documento-id={documento.id}>
        <MiniaturaDelDocumento documento={documento} miniaturas={contexto.miniaturas} />
        <div className="grid min-w-0 gap-1">
          {conArchivo ? (
            <AbrirResumen nombre={nombre} verbo="Ver" className="min-w-0">
              {textoDelNombre}
            </AbrirResumen>
          ) : (
            textoDelNombre
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
            <EstadoYVencimiento documento={documento} hoy={hoy} />
            <span>
              {extensionDelArchivo(documento)}
              {peso}
            </span>
          </div>
        </div>
      </div>
      {documento.estado === 'rechazado' && documento.motivoDeRechazo ? (
        <p className="text-destructive min-w-0 text-(length:--text-sm) break-words">
          Rechazado: {documento.motivoDeRechazo}
        </p>
      ) : null}
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={contexto.releer}
          detalle="No se cambió nada. Recargar trae la versión nueva."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
    </TarjetaDeLista>
  )
}
