'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { UsosDelMes } from '../../../entities/asistente-ia/usos'
import type { Integracion } from '../../../entities/integraciones'
import {
  MOTIVO_INTEGRACION_NO_INSTALADA,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../../../entities/motivos'
import {
  usePanelesDeIntegraciones,
  type MotivosDeLosPaneles,
} from '../hooks/use-paneles-de-integraciones'
import { ModalesDeIntegraciones } from './modales-de-integraciones'
import { TarjetaDeApibara } from './tarjeta-de-apibara'
import { TarjetaDeAsistenteIa } from './tarjeta-de-asistente-ia'
import { TarjetaDeAvisosPush } from './tarjeta-de-avisos-push'
import { TarjetaDeWebPublica } from './tarjeta-de-web-publica'

type Props = {
  // La fila de apibara. Cada integración es una fila con su versión, y cada escritura (el interruptor, la configuración, la clave) usa la suya.
  apibara: Integracion
  // La fila de la web pública, si la instalación la tiene, y cuántos vehículos cambian al encenderla o apagarla (sólo para quien puede editar).
  webPublica?: Integracion | undefined
  // La fila de los avisos push, si la instalación la tiene, y si falta la clave pública (la lee el servidor de `app/`).
  pushWeb?: Integracion | undefined
  sinClavePublica: boolean
  vehiculosQueCambian: ConteoAcotado | null
  // La fila del asistente de IA, si la instalación la tiene, y sus usos de este mes (null si no se pudieron leer).
  asistente?: Integracion | undefined
  usosDelAsistente: UsosDelMes | null
  puedeEditar: boolean
}

// La pantalla «Integraciones»: una tarjeta por integración con su estado. Los interruptores guardan al instante; la dirección y las
// plataformas de apibara, el proveedor y las indicaciones del asistente, la clave y el secreto se editan en sus modales (`?panel=`), una
// escritura cada uno.
export function TarjetasDeIntegraciones({
  apibara,
  webPublica,
  pushWeb,
  sinClavePublica,
  vehiculosQueCambian,
  asistente,
  usosDelAsistente,
  puedeEditar,
}: Props) {
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  // Una integración que la instalación no tiene: su `?panel=` se avisa y se limpia.
  const noInstalada = motivo ?? MOTIVO_INTEGRACION_NO_INSTALADA
  const motivos: MotivosDeLosPaneles = {
    apibara: motivo,
    'clave-apibara': motivo,
    'web-publica': webPublica ? motivo : noInstalada,
    'secreto-web-publica': webPublica ? motivo : noInstalada,
    'asistente-ia': asistente ? motivo : noInstalada,
    'indicaciones-asistente-ia': asistente ? motivo : noInstalada,
    'clave-asistente-ia': asistente ? motivo : noInstalada,
  }
  const paneles = usePanelesDeIntegraciones(motivos)

  return (
    <>
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <TarjetasDeAjustes etiqueta="Integraciones">
        <TarjetaDeApibara apibara={apibara} puedeEditar={puedeEditar} paneles={paneles} />
        {webPublica ? (
          <TarjetaDeWebPublica
            webPublica={webPublica}
            vehiculosQueCambian={vehiculosQueCambian}
            puedeEditar={puedeEditar}
            paneles={paneles}
          />
        ) : null}
        {pushWeb ? (
          <TarjetaDeAvisosPush
            pushWeb={pushWeb}
            sinClavePublica={sinClavePublica}
            puedeEditar={puedeEditar}
          />
        ) : null}
        {asistente ? (
          <TarjetaDeAsistenteIa
            asistente={asistente}
            usos={usosDelAsistente}
            puedeEditar={puedeEditar}
            paneles={paneles}
          />
        ) : null}
      </TarjetasDeAjustes>
      <ModalesDeIntegraciones
        apibara={apibara}
        webPublica={webPublica}
        asistente={asistente}
        paneles={paneles}
      />
    </>
  )
}
