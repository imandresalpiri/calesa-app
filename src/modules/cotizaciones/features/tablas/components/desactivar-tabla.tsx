'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { DESCRIPCION_DE_DESACTIVAR } from '../../../entities/tablas/estructura'
import { rutaDeLasTablas, type LugarDeLasTablas } from '../../../entities/tablas/rutas'
import { desactivarTabla } from '../actions/desactivar-tabla'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tabla: { id: string; nombre: string; version: number }
  // El origen de la pestaña (nulo en Catálogos): a su lista se vuelve.
  origenId: string | null
  // Dónde se dibujan las tablas: al entrar se vuelve a su lista.
  lugar: LugarDeLasTablas
}

// «Desactivar «<nombre>»» (`?tabla=<id>&panel=desactivar-tabla`): con la versión abierta. En uso (23503) o sin permiso (42501), el texto de la base en un aviso;
// el PT409, dentro del diálogo con «Recargar»; sin conexión, el diálogo queda abierto y lo dice. Al entrar vuelve a la lista, donde ya no está.
export function DesactivarTabla({ abierto, alCerrar, tabla, origenId, lugar }: Props) {
  const router = useRouter()
  const desactivar = useAction(desactivarTabla)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [sinRed, setSinRed] = useState(false)
  // Entró: mientras navega a la lista, otro clic reenviaría sobre una tabla ya inactiva.
  const [listo, setListo] = useState(false)
  const [recargando, recargarPagina] = useTransition()

  async function confirmar() {
    if (listo) return
    const hecho = await mandar(() =>
      enviarAccion(
        desactivar.executeAsync({ tablaId: tabla.id, origenId, versionEsperada: tabla.version }),
        'No se pudo desactivar la tabla.',
      ),
    )
    if (hecho === null) return
    setSinRed(false)
    if (hecho.ok) {
      setListo(true)
      // La ruta nueva ya no lleva `?panel=`: cierra el diálogo. Cerrarlo antes escribiría la URL después y pisaría esta.
      avisarExito(`Desactivaste «${tabla.nombre}».`)
      router.replace(rutaDeLasTablas(lugar))
      return
    }
    if ('sinRed' in hecho) {
      setSinRed(true)
      return
    }
    if (hecho.error.codigo === 'conflicto') {
      setConflicto(hecho.error.mensaje)
      return
    }
    alCerrar()
    avisarError(hecho.error)
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={confirmar}
      titulo={`Desactivar «${tabla.nombre}»`}
      descripcion={DESCRIPCION_DE_DESACTIVAR}
      etiquetaConfirmar="Desactivar"
      enCurso={enCurso || listo}
      deshabilitado={conflicto !== null}
    >
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          enCurso={recargando}
          alRecargar={() => {
            recargarPagina(() => {
              alCerrar()
              router.refresh()
            })
          }}
        />
      ) : null}
      {sinRed ? (
        <Aviso tono="aviso">
          <p>{MENSAJE_SIN_CONEXION}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
