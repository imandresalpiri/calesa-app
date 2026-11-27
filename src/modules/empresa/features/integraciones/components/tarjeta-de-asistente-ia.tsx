'use client'

import { useState } from 'react'
import type { AccionDelAviso } from '@/shared/lib/acciones-del-aviso'
import type { Resultado } from '@/shared/lib/errores'
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
import { resumenDeLosAtajos } from '../../../entities/asistente-ia/atajos'
import {
  PREAJUSTES_DEL_ASISTENTE,
  configDelAsistente,
  type ConfigDelAsistente,
} from '../../../entities/asistente-ia/config'
import { accionDelAsistente, esCausaDelAsistente } from '../../../entities/asistente-ia/respuesta'
import type { UsosDelMes } from '../../../entities/asistente-ia/usos'
import { estadoDeIntegracion, type Integracion } from '../../../entities/integraciones'
import {
  MOTIVO_ACTIVAR_SIN_CLAVE,
  MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../../../entities/motivos'
import { useAsistenteIa } from '../hooks/use-asistente-ia'
import type { PanelesDeIntegraciones } from '../hooks/use-paneles-de-integraciones'
import { accionesDelAsistente } from './acciones-de-la-integracion'
import { EstadoDeLaIntegracion } from './estado-de-la-integracion'
import { ResultadoDeLaPrueba, type Prueba } from './resultado-de-la-prueba'
import { UsosDelAsistente } from './usos-del-asistente'

type Props = {
  asistente: Integracion
  // Los usos de este mes por persona; null si no se pudieron leer.
  usos: UsosDelMes | null
  puedeEditar: boolean
  paneles: PanelesDeIntegraciones
}

// «Clave: guardada el … · termina en ····abcd»: de la clave sólo se sabe cuándo se guardó y sus últimos 4.
function filaDeLaClave(
  asistente: Integracion,
  config: ConfigDelAsistente,
  zona: string,
): FilaDeValores {
  if (asistente.secretoGuardadoEn === null) {
    return { etiqueta: 'Clave', valor: 'Falta la clave' }
  }
  const guardada = `Guardada el ${formatearFechaHora(asistente.secretoGuardadoEn, { zona })}`
  return {
    etiqueta: 'Clave',
    valor: config.claveTerminaEn
      ? `${guardada} · termina en ····${config.claveTerminaEn}`
      : guardada,
    nota: 'No se puede ver: sólo reemplazar.',
  }
}

function filasDeValores(
  asistente: Integracion,
  usos: UsosDelMes | null,
  zona: string,
): FilaDeValores[] {
  const config = configDelAsistente(asistente.config)
  return [
    { etiqueta: 'Proveedor', valor: PREAJUSTES_DEL_ASISTENTE[config.preajuste].nombre },
    { etiqueta: 'Dirección', valor: config.urlBase || null },
    { etiqueta: 'Modelo', valor: config.modelo || null },
    filaDeLaClave(asistente, config, zona),
    {
      etiqueta: 'Prompt base',
      valor: config.promptBase ? (
        <span className="line-clamp-2 whitespace-pre-line">{config.promptBase}</span>
      ) : (
        'Sin prompt base'
      ),
    },
    { etiqueta: 'Atajos', valor: resumenDeLosAtajos(config.atajos) },
    { etiqueta: 'Usos de este mes', valor: <UsosDelAsistente usos={usos} /> },
  ]
}

// Lo que dice la tarjeta tras «Probar conexión», con la acción que destraba un error (reemplazar la clave, configurar).
function resultadoDeProbar(resultado: Resultado<{ modelo: string }>): {
  prueba: Prueba
  accion: AccionDelAviso | null
} {
  if (resultado.ok) {
    return {
      prueba: {
        ok: true,
        data: { tono: 'positivo', texto: `Respondió el modelo ${resultado.data.modelo}.` },
      },
      accion: null,
    }
  }
  const { causa } = resultado.error
  return {
    prueba: resultado,
    accion: esCausaDelAsistente(causa)
      ? accionDelAsistente(causa, { enIntegraciones: true })
      : null,
  }
}

// La tarjeta del asistente de IA: su estado, el interruptor (que no enciende sin clave), lo guardado con los usos del mes y, en el «⋯», el
// proveedor, el prompt base y los atajos, la clave y «Probar conexión», cuya respuesta se dibuja en la tarjeta.
export function TarjetaDeAsistenteIa({ asistente, usos, puedeEditar, paneles }: Props) {
  const { zonaHoraria } = useRegional()
  const ediciones = useAsistenteIa(asistente.actualizadoEn)
  // Un cambio en la fila deja viejo el resultado de la prueba anterior.
  const [prueba, setPrueba] = useState<
    ({ version: string } & ReturnType<typeof resultadoDeProbar>) | null
  >(null)
  const conClave = asistente.secretoGuardadoEn !== null
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const motivoDeProbar = motivo ?? (conClave ? null : MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE)
  const sinPoderEncender = !conClave && !asistente.activa

  return (
    <TarjetaDeAjustes
      titulo="Asistente de IA"
      estado={
        <EstadoDeLaIntegracion
          estado={estadoDeIntegracion(asistente, { sinClavePublica: false })}
        />
      }
      toque={
        motivo === null ? (
          <ToqueDeLaTarjeta
            etiqueta="Configurar el asistente de IA"
            abrir={paneles.asistente.abrir}
          />
        ) : undefined
      }
      acciones={
        <MasAcciones
          nombre="Asistente de IA"
          acciones={accionesDelAsistente({
            paneles,
            conClave,
            motivo,
            motivoDeProbar,
            probando: ediciones.probando,
            probar: () => {
              void ediciones.probar().then((resultado) => {
                setPrueba({ version: asistente.actualizadoEn, ...resultadoDeProbar(resultado) })
              })
            },
          })}
        />
      }
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Redacta los textos de compartir con la IA que elija la empresa.
      </p>
      <Interruptor
        titulo="Activa"
        ayuda={
          sinPoderEncender
            ? MOTIVO_ACTIVAR_SIN_CLAVE
            : 'Con el asistente activo, quien comparte una cotización puede pedirle el texto.'
        }
        valor={asistente.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso || sinPoderEncender}
      />
      <ValoresDeLaTarjeta filas={filasDeValores(asistente, usos, zonaHoraria)} />
      {motivoDeProbar === null ? (
        // `min-h-28`: el aviso de un error con su acción en dos líneas (la del celular, a 44 px), en rem: la respuesta no hace saltar la tarjeta.
        <div className="min-h-28">
          {prueba?.version === asistente.actualizadoEn ? (
            <ResultadoDeLaPrueba prueba={prueba.prueba} accion={prueba.accion} />
          ) : (
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              Prueba la conexión desde el «⋯» para ver qué responde el proveedor.
            </p>
          )}
        </div>
      ) : null}
    </TarjetaDeAjustes>
  )
}
