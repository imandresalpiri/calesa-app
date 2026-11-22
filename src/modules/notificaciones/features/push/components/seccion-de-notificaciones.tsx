'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados'
import {
  TarjetaDeAjustes,
  TarjetaEditable,
  ValoresDeLaTarjeta,
} from '@/shared/ui/tarjetas-de-ajustes'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { contarEncendidos, type ApagadosDePush } from '../../../entities/preferencia-de-push'
import type { SuscripcionPropia } from '../../../entities/suscripcion'
import { TIPOS_DE_NOTIFICACION } from '../../../entities/tipos'
import { usePreferenciasPorTipo } from '../../preferencias/hooks/use-preferencias-por-tipo'
import { useAbrirPorAncla } from '../hooks/use-abrir-por-ancla'
import { usePush } from '../hooks/use-push'
import { InterruptorDePush } from './interruptor-de-push'
import { ModalDeNotificaciones } from './modal-de-notificaciones'

type Props = {
  tienePermiso: boolean
  integracionActiva: boolean
  clavePublica: string | null
  // `null` = la lectura falló: se dibuja el error con «Reintentar».
  suscripciones: SuscripcionPropia[] | null
  apagados: ApagadosDePush | null
}

const TIPOS = Object.keys(TIPOS_DE_NOTIFICACION)
const SIN_APAGAR: ApagadosDePush = {}

// La tarjeta «Notificaciones» de `/perfil` con su modal: a la vista, el push de este navegador (el interruptor) y cuántos avisos por tipo y navegadores hay;
// «Editar» abre el modal con los interruptores por tipo y «Tus navegadores» (`?panel=notificaciones`; `#notificaciones` también lo abre).
export function SeccionDeNotificaciones({
  tienePermiso,
  integracionActiva,
  clavePublica,
  suscripciones,
  apagados,
}: Props) {
  const router = useRouter()
  const push = usePush({ tienePermiso, integracionActiva, clavePublica })
  const preferencias = usePreferenciasPorTipo(apagados ?? SIN_APAGAR)
  const { abierto, abrir, cerrar } = usePanelPorUrl('notificaciones')
  useAbrirPorAncla('notificaciones', abrir)
  if (suscripciones === null || apagados === null) {
    return (
      <TarjetaDeAjustes titulo="Notificaciones">
        <EstadoError
          compacto
          titulo="No se pudieron cargar tus avisos"
          alReintentar={() => router.refresh()}
        />
      </TarjetaDeAjustes>
    )
  }
  const encendidos = contarEncendidos(preferencias.apagados, TIPOS)
  return (
    <>
      <TarjetaEditable titulo="Notificaciones" motivo={null} abrir={abrir}>
        <InterruptorDePush push={push} />
        <ValoresDeLaTarjeta
          filas={[
            {
              etiqueta: 'Avisos por tipo',
              valor: `${String(encendidos)} de ${String(TIPOS.length)} encendidos`,
            },
            { etiqueta: 'Tus navegadores', valor: String(suscripciones.length) },
          ]}
        />
      </TarjetaEditable>
      <ModalDeNotificaciones
        abierto={abierto}
        alCerrar={cerrar}
        tienePermiso={tienePermiso}
        preferencias={preferencias}
        suscripciones={suscripciones}
        esteNavegador={push.endpointDeEsteNavegador}
        ocupado={push.enCurso}
        alQuitar={(endpoint) => void push.quitar(endpoint)}
      />
    </>
  )
}
