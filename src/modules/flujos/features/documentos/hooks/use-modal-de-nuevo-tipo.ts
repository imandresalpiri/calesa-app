'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { ACCION_NUEVO_TIPO, CLAVE_DE_ACCION } from '../../../entities/panel-del-flujo'
import {
  MOTIVO_SIN_CREAR_TIPOS,
  grupoParaCrear,
  type QuienCambiaLosTipos,
} from '../../../entities/documentos/quien-cambia-los-tipos'
import { CLAVE_DEL_GRUPO } from '../../../entities/documentos/tipo-de-documento'
import { claveDeGrupoDe } from '../../../entities/documentos/vista-de-grupo'

const PARAMETROS = {
  [CLAVE_DE_ACCION]: parseAsString,
  [CLAVE_DEL_GRUPO]: parseAsString,
}

// «Nuevo tipo de documento» en la URL (`?accion=nuevo-tipo&de=origen|compartido`; sin `de`, `origen`): lo abre el drawer de los tipos o un requisito
// de documento (`useTipoCreado().abrirNuevo()`) y no cierra la fase ni el drawer de abajo. «Para» empieza en el grupo pedido si quien mira puede crear
// ahí; si no, en el otro. Sin ninguno, no abre: se avisa y la URL se limpia (escrita a mano también).
export function useModalDeNuevoTipo(quien: QuienCambiaLosTipos) {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const pedido = url[CLAVE_DE_ACCION] === ACCION_NUEVO_TIPO
  useVueltaDelFoco(CLAVE_DE_ACCION, pedido)
  const apertura = useApertura(pedido)
  const grupo = grupoParaCrear(quien, claveDeGrupoDe(url[CLAVE_DEL_GRUPO]))
  const cerrar = () => {
    void setUrl({ [CLAVE_DE_ACCION]: null, [CLAVE_DEL_GRUPO]: null }, { scroll: false })
  }
  const rechazada = useRevisionAlAbrir(
    pedido ? String(apertura) : null,
    pedido && grupo === null ? MOTIVO_SIN_CREAR_TIPOS : null,
    cerrar,
  )
  return {
    abierto: pedido && !rechazada && grupo !== null,
    apertura,
    inicial: grupo ?? 'origen',
    cerrar,
  }
}
