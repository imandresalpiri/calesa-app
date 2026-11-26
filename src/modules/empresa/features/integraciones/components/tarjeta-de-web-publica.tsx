'use client'

import { useState } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { Resultado } from '@/shared/lib/errores'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Interruptor } from '@/shared/ui/interruptor'
import { MasAcciones } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import {
  TarjetaDeAjustes,
  ToqueDeLaTarjeta,
  ValoresDeLaTarjeta,
} from '@/shared/ui/tarjetas-de-ajustes'
import {
  ayudaDelInterruptorDeLaWeb,
  configDeWebPublica,
  estadoDeIntegracion,
  type Integracion,
} from '../../../entities/integraciones'
import {
  MOTIVO_PROBAR_SIN_DIRECCION,
  MOTIVO_PROBAR_SIN_SECRETO,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../../../entities/motivos'
import type { PanelesDeIntegraciones } from '../hooks/use-paneles-de-integraciones'
import { useWebPublica } from '../hooks/use-web-publica'
import { accionesDeLaWeb } from './acciones-de-la-integracion'
import { EstadoDeLaIntegracion } from './estado-de-la-integracion'
import { ResultadoDeLaPrueba, type Prueba } from './resultado-de-la-prueba'

type Props = {
  webPublica: Integracion
  // Cuántos vehículos publicados empiezan o dejan de verse; null si no se pudo contar.
  vehiculosQueCambian: ConteoAcotado | null
  puedeEditar: boolean
  paneles: PanelesDeIntegraciones
}

// Lo que respondió la dirección de la web pública a «Probar», en palabras.
export function textoDeLaPruebaDeLaWeb(
  resultado: Resultado<{ codigo: number; conHttps: boolean }>,
  locale: string,
): Prueba {
  if (!resultado.ok) {
    return resultado
  }
  const { codigo, conHttps } = resultado.data
  const respondio = `Respondió ${formatearNumero(codigo, { locale, decimales: 0 })}.`
  return {
    ok: true,
    data: {
      tono: codigo >= 200 && codigo < 300 ? 'positivo' : 'aviso',
      texto: conHttps
        ? respondio
        : `${respondio} Con http:// sólo se prueba: el aviso de cada minuto sale sólo a https://.`,
    },
  }
}

// Por qué «Probar» no se puede, o null.
function motivoDeProbar(puedeEditar: boolean, direccion: string | null, conSecreto: boolean) {
  if (!puedeEditar) {
    return MOTIVO_SIN_PERMISO_AJUSTES
  }
  if (direccion === null) {
    return MOTIVO_PROBAR_SIN_DIRECCION
  }
  return conSecreto ? null : MOTIVO_PROBAR_SIN_SECRETO
}

// La tarjeta de la web pública: su estado, el interruptor (que dice cuántos vehículos cambian), lo guardado y, en el «⋯», configurar, el secreto y
// «Probar», cuya respuesta se dibuja en la tarjeta.
export function TarjetaDeWebPublica({
  webPublica,
  vehiculosQueCambian,
  puedeEditar,
  paneles,
}: Props) {
  const { locale, zonaHoraria } = useRegional()
  const ediciones = useWebPublica(webPublica.actualizadoEn)
  // Un cambio en la fila deja viejo el resultado de la prueba anterior.
  const [prueba, setPrueba] = useState<{ version: string; resultado: Prueba } | null>(null)
  const direccion = configDeWebPublica(webPublica.config).revalidar_url
  const conSecreto = webPublica.secretoGuardadoEn !== null
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const motivoDelProbar = motivoDeProbar(puedeEditar, direccion, conSecreto)

  return (
    <TarjetaDeAjustes
      titulo="Web pública"
      estado={
        <EstadoDeLaIntegracion
          estado={estadoDeIntegracion(webPublica, { sinClavePublica: false })}
        />
      }
      toque={
        motivo === null ? (
          <ToqueDeLaTarjeta etiqueta="Configurar la web pública" abrir={paneles.webPublica.abrir} />
        ) : undefined
      }
      acciones={
        <MasAcciones
          nombre="Web pública"
          acciones={accionesDeLaWeb({
            paneles,
            conSecreto,
            motivo,
            motivoDeProbar: motivoDelProbar,
            probando: ediciones.probando,
            probar: () => {
              void ediciones.probar().then((resultado) => {
                setPrueba({
                  version: webPublica.actualizadoEn,
                  resultado: textoDeLaPruebaDeLaWeb(resultado, locale),
                })
              })
            },
          })}
        />
      }
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Muestra en el sitio los vehículos publicados y avisa al sitio cuando algo cambia.
      </p>
      <Interruptor
        titulo="Activa"
        ayuda={ayudaDelInterruptorDeLaWeb(webPublica.activa, vehiculosQueCambian, locale)}
        valor={webPublica.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso}
      />
      <ValoresDeLaTarjeta
        filas={[
          { etiqueta: 'Dirección de revalidación', valor: direccion },
          {
            etiqueta: 'Secreto',
            valor: webPublica.secretoGuardadoEn
              ? `Guardado el ${formatearFechaHora(webPublica.secretoGuardadoEn, { zona: zonaHoraria })}`
              : 'Falta el secreto',
            ...(conSecreto ? { nota: 'No se puede ver: sólo reemplazar.' } : {}),
          },
        ]}
      />
      {prueba?.version === webPublica.actualizadoEn ? (
        <ResultadoDeLaPrueba prueba={prueba.resultado} />
      ) : null}
    </TarjetaDeAjustes>
  )
}
