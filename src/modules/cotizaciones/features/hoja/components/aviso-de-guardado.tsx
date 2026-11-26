'use client'

import { useEffect } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import type { EleccionesDeLaHoja } from '../../../entities/obligatorios-al-cotizar'
import type { SalidaDelAviso, TextoDelAviso } from '../../../entities/guardado'
import type { EstadoDelGuardado, VistaDelGuardado } from '../hooks/use-nucleo-del-guardado'
import { useTituloDeLaCotizacion } from '../hooks/use-titulo-de-la-cotizacion'
import { ElegirLoQueFalta } from './elegir-lo-que-falta'

type Props = {
  estado: EstadoDelGuardado
  // El último guardado no se confirmó: «Guardar» lo vuelve a mandar tal como estaba (P3).
  hayPendiente: boolean
  enLinea: boolean
  alRecargar: () => void
  alReintentar: () => void
  // D2 (P2): la versión de la fórmula con que se abrió la hoja, y sus dos salidas.
  version: number
  alUsarLaNueva: () => void
  alGuardarConLaAbierta: () => void
  // Una cotización guardada confirma lo guardado (4.15-3): «Cambios guardados.», hasta el próximo cambio.
  confirmacion: string | null
  // Cómo se elige lo que la regla del rol ahora pide (la hoja nueva; una guardada no la trae).
  elecciones: EleccionesDeLaHoja | undefined
}

function SalidasD2({
  por,
  version,
  alUsarLaNueva,
  alGuardarConLaAbierta,
}: {
  por: 'formula' | 'tipo_cambio'
  version: number
  alUsarLaNueva: () => void
  alGuardarConLaAbierta: () => void
}) {
  return (
    <>
      <Button variant="outline" className={CLASE_DEL_BOTON} onClick={alUsarLaNueva}>
        {por === 'formula' ? 'Usar la versión nueva' : 'Usar el de hoy'}
      </Button>
      <Button variant="outline" className={CLASE_DEL_BOTON} onClick={alGuardarConLaAbierta}>
        {por === 'formula'
          ? `Guardar con la versión ${String(version)}`
          : 'Guardar con el de la hoja'}
      </Button>
    </>
  )
}

const CLASE_DEL_BOTON = 'min-h-11 md:min-h-8'

// La regla del rol cambió con la hoja abierta: el botón (o el pedido) de lo que ahora pide. Una guardada no trae `elecciones`: nada que ofrecer.
function SalidaDeElegir({
  salida,
  elecciones,
}: {
  salida: SalidaDelAviso
  elecciones: EleccionesDeLaHoja | undefined
}) {
  const que = QUE_ELIGE[salida ?? 'nada']
  if (!elecciones || que === undefined) {
    return null
  }
  return <ElegirLoQueFalta que={que} eleccion={elecciones[que]} />
}

const QUE_ELIGE: Partial<
  Record<NonNullable<SalidaDelAviso> | 'nada', 'lead' | 'vehiculo' | 'titulo'>
> = {
  elegir_lead: 'lead',
  elegir_vehiculo: 'vehiculo',
  elegir_titulo: 'titulo',
}

// Un rechazo de la base sobre el título (`campo: 'titulo'`) se repite debajo del campo del panel del vehículo, mientras el aviso esté.
function RechazoAlCampoDelTitulo({ aviso }: { aviso: TextoDelAviso | null }) {
  const ponerRechazo = useTituloDeLaCotizacion()?.ponerRechazo
  const texto = aviso?.campo === 'titulo' ? aviso.texto : null
  useEffect(() => {
    if (ponerRechazo === undefined || texto === null) {
      return
    }
    ponerRechazo(texto)
    return () => {
      ponerRechazo(null)
    }
  }, [ponerRechazo, texto])
  return null
}

function Confirmacion({
  confirmacion,
  estado,
}: {
  confirmacion: string | null
  estado: EstadoDelGuardado
}) {
  return confirmacion !== null && estado.tipo === 'guardada' ? (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">{confirmacion}</p>
  ) : null
}

function PendienteSinConfirmar({
  hayPendiente,
  estado,
}: {
  hayPendiente: boolean
  estado: EstadoDelGuardado
}) {
  return hayPendiente && estado.tipo !== 'guardando' ? (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      El último guardado no se confirmó. «Guardar» lo vuelve a mandar tal como estaba.
    </p>
  ) : null
}

// Lo que dice el último guardado que no entró, con la salida que lo arregla (`textoDelRechazo`, `textoDelFallo`): D2 (P2) en línea, «Usar la versión nueva» o «Guardar con
// la versión N» (y las del tipo de cambio, sin decir cuál: puede ser de un nodo oculto); «Recargar» reabre la hoja, «Reintentar» vuelve a guardar,
// «Ingresar» abre el ingreso en otra pestaña (lo escrito sigue acá). Sin salida, ningún botón: uno que no arregla nada no se ofrece. Va en la región viva del cierre de la hoja.
function AvisoDeGuardado({
  estado,
  hayPendiente,
  enLinea,
  alRecargar,
  alReintentar,
  version,
  alUsarLaNueva,
  alGuardarConLaAbierta,
  confirmacion,
  elecciones,
}: Props) {
  const aviso = estado.tipo === 'aviso' ? estado.aviso : null
  return (
    <>
      <Confirmacion confirmacion={confirmacion} estado={estado} />
      <RechazoAlCampoDelTitulo aviso={aviso} />
      {aviso === null ? null : (
        <div data-aviso-de-guardado="" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
            {aviso.texto}
          </p>
          {aviso.salida === 'd2' && estado.tipo === 'aviso' && estado.d2 !== null ? (
            <SalidasD2
              por={estado.d2.por}
              version={version}
              alUsarLaNueva={alUsarLaNueva}
              alGuardarConLaAbierta={alGuardarConLaAbierta}
            />
          ) : null}
          <SalidaDeElegir salida={aviso.salida} elecciones={elecciones} />
          {aviso.salida === 'recargar' ? (
            <Button variant="outline" className={CLASE_DEL_BOTON} onClick={alRecargar}>
              Recargar
            </Button>
          ) : null}
          {aviso.salida === 'reintentar' && enLinea ? (
            <Button
              variant="outline"
              className={CLASE_DEL_BOTON}
              // Como «Guardar»: el foco no sale de una celda abierta.
              onMouseDown={(evento) => {
                evento.preventDefault()
              }}
              onClick={alReintentar}
            >
              Reintentar
            </Button>
          ) : null}
          {aviso.salida === 'ingresar' ? (
            <Button
              variant="outline"
              className={CLASE_DEL_BOTON}
              onClick={() => {
                window.open(RUTAS.ingreso, '_blank', 'noopener')
              }}
            >
              Ingresar
            </Button>
          ) : null}
        </div>
      )}
      <PendienteSinConfirmar hayPendiente={hayPendiente} estado={estado} />
    </>
  )
}

// El aviso con lo que la hoja le pone: «Reintentar» es «Guardar» (confirma la celda abierta y arma el pedido con el total al día); «Recargar» y «Usar la versión nueva» piden la página (otra hoja abierta la vuelve a montar).
export function AvisoDelGuardado({
  guardado,
  alReintentar,
  version,
  alRecargar,
  confirmacion = null,
  elecciones,
}: {
  guardado: VistaDelGuardado
  alReintentar: () => void
  version: number
  alRecargar: () => void
  confirmacion?: string | null
  elecciones?: EleccionesDeLaHoja | undefined
}) {
  return (
    <AvisoDeGuardado
      estado={guardado.estado}
      hayPendiente={guardado.hayPendiente}
      enLinea={guardado.enLinea}
      alRecargar={alRecargar}
      alReintentar={alReintentar}
      version={version}
      alUsarLaNueva={alRecargar}
      alGuardarConLaAbierta={guardado.guardarConLaAbierta}
      confirmacion={confirmacion}
      elecciones={elecciones}
    />
  )
}
