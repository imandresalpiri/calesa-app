'use client'

import { NOMBRE_DE_PLATAFORMA } from '@/shared/lib/apibara'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Interruptor } from '@/shared/ui/interruptor'
import { MasAcciones } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import {
  TarjetaDeAjustes,
  ToqueDeLaTarjeta,
  ValoresDeLaTarjeta,
  type FilaDeValores,
} from '@/shared/ui/tarjetas-de-ajustes'
import {
  configDeApibara,
  estadoDeIntegracion,
  puedeActivarse,
  type Integracion,
} from '../../../entities/integraciones'
import {
  MOTIVO_SIN_PERMISO_AJUSTES,
  MOTIVO_SIN_SECRETO,
  MOTIVO_SIN_USO_SIN_CLAVE,
} from '../../../entities/motivos'
import { useApibara } from '../hooks/use-apibara'
import type { PanelesDeIntegraciones } from '../hooks/use-paneles-de-integraciones'
import { useUsoDeApibara } from '../hooks/use-uso-de-apibara'
import { accionesDeApibara } from './acciones-de-la-integracion'
import { EstadoDeLaIntegracion } from './estado-de-la-integracion'
import { ResultadoDelUso } from './resultado-del-uso'

type Props = { apibara: Integracion; puedeEditar: boolean; paneles: PanelesDeIntegraciones }

// «Clave: guardada el …»: del secreto sólo se sabe cuándo se guardó.
function filaDeLaClave(guardadoEn: string | null, zona: string): FilaDeValores {
  return guardadoEn
    ? {
        etiqueta: 'Clave',
        valor: `Guardada el ${formatearFechaHora(guardadoEn, { zona })}`,
        nota: 'No se puede ver: sólo reemplazar.',
      }
    : { etiqueta: 'Clave', valor: 'Falta la clave' }
}

// La tarjeta de apibara: su estado, el interruptor que guarda al instante, lo guardado y, en el «⋯», configurar, la clave y «Ver uso».
export function TarjetaDeApibara({ apibara, puedeEditar, paneles }: Props) {
  const ediciones = useApibara(apibara.actualizadoEn)
  const uso = useUsoDeApibara()
  const { zonaHoraria } = useRegional()
  const config = configDeApibara(apibara.config)
  const sinClave = !puedeActivarse(apibara)
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const motivoDelUso = motivo ?? (sinClave ? MOTIVO_SIN_USO_SIN_CLAVE : null)

  return (
    <TarjetaDeAjustes
      titulo="apibara"
      estado={
        <EstadoDeLaIntegracion estado={estadoDeIntegracion(apibara, { sinClavePublica: false })} />
      }
      toque={
        motivo === null ? (
          <ToqueDeLaTarjeta etiqueta="Configurar apibara" abrir={paneles.apibara.abrir} />
        ) : undefined
      }
      acciones={
        <MasAcciones
          nombre="apibara"
          acciones={accionesDeApibara({
            paneles,
            sinClave,
            motivo,
            motivoDelUso,
            consultando: uso.estado.tipo === 'pidiendo',
            verUso: () => void uso.pedir(),
          })}
        />
      }
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Trae la ficha y las fotos de un vehículo de subasta a partir de su enlace o su lote.
      </p>
      <Interruptor
        titulo="Activa"
        ayuda={
          sinClave && !apibara.activa
            ? MOTIVO_SIN_SECRETO
            : 'Con la integración activa, un vehículo de subasta se puede dar de alta pegando su enlace.'
        }
        valor={apibara.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso || (sinClave && !apibara.activa)}
      />
      <ValoresDeLaTarjeta
        filas={[
          { etiqueta: 'Dirección del servicio', valor: config.endpoint || null },
          {
            etiqueta: 'Plataformas',
            valor:
              config.plataformas.map((plataforma) => NOMBRE_DE_PLATAFORMA[plataforma]).join(', ') ||
              null,
          },
          filaDeLaClave(apibara.secretoGuardadoEn, zonaHoraria),
        ]}
      />
      <ResultadoDelUso estado={uso.estado} />
    </TarjetaDeAjustes>
  )
}
