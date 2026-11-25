'use client'

import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import { MENSAJE_DE_LA_TABLA_QUE_CAMBIO } from '../../../../entities/tablas/edicion-en-la-ayuda'
import { MENSAJE_DEL_TOPE, TOPE_DE_FILAS } from '../../../../entities/tablas/validacion'
import type { EdicionEnLaAyudaEnUso } from '../../hooks/use-edicion-en-la-ayuda'
import type { EsperaDeLaHoja } from '../../hooks/use-espera-de-la-hoja'
import type { GuardadoEnLaAyuda } from '../../hooks/use-guardado-en-la-ayuda'
import { BarraDeLaEdicion } from './barra-de-la-edicion'

const BOTON = 'min-h-11 w-fit md:min-h-9'

function SumarFila({ edicion, guardando }: { edicion: EdicionEnLaAyudaEnUso; guardando: boolean }) {
  const enElTope = (edicion.leida?.edicion.estado.filas.length ?? 0) >= TOPE_DE_FILAS
  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant="outline"
        className={BOTON}
        disabled={enElTope || guardando || edicion.abriendo !== null}
        onClick={() => {
          edicion.pedir({ tipo: 'sumar' })
        }}
      >
        {edicion.abriendo?.tipo === 'sumar' ? (
          'Abriendo…'
        ) : (
          <>
            <PlusIcon aria-hidden />
            Añadir fila
          </>
        )}
      </Button>
      {enElTope ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{MENSAJE_DEL_TOPE}</p>
      ) : null}
    </div>
  )
}

function SinAbrir({
  edicion,
  enLaConfiguracion,
}: {
  edicion: EdicionEnLaAyudaEnUso
  enLaConfiguracion: ReactNode
}) {
  if (edicion.sinAbrir === null) return null
  if (edicion.sinAbrir === 'configuracion') {
    return (
      <Aviso tono="info">
        <p>Esta tabla se edita en la configuración.</p>
        {enLaConfiguracion}
      </Aviso>
    )
  }
  return (
    <Aviso tono="peligro">
      <p>No se pudo abrir la tabla para editar.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 min-h-11 md:min-h-7"
        disabled={edicion.abriendo !== null}
        onClick={edicion.releer}
      >
        Reintentar
      </Button>
    </Aviso>
  )
}

function LaHojaAlDia({ espera }: { espera: EsperaDeLaHoja }) {
  if (espera === 'no') return null
  if (espera === 'esperando') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Poniendo la hoja al día con la tabla nueva…
      </p>
    )
  }
  return (
    <Aviso tono="aviso">
      <p>No pudimos poner la hoja al día con la tabla nueva. Lo tipeado quedó guardado.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 min-h-11 md:min-h-7"
        onClick={() => {
          window.location.reload()
        }}
      >
        Recargar
      </Button>
    </Aviso>
  )
}

type Props = {
  edicion: EdicionEnLaAyudaEnUso
  guardado: GuardadoEnLaAyuda
  espera: EsperaDeLaHoja
  enLaConfiguracion: ReactNode
  motivo: string | null
}

// Lo de debajo de las filas: «+ Añadir fila», por qué no se abrió la tabla viva y, abierta, si cambió desde que se abrió la hoja, lo que pasa con el guardado y la barra.
// Publicada, lo que se espera de la hoja.
export function PieDeLaEdicion({ edicion, guardado, espera, enLaConfiguracion, motivo }: Props) {
  const { leida } = edicion
  return (
    <div className="grid gap-3">
      <SumarFila edicion={edicion} guardando={guardado.enCurso} />
      <SinAbrir edicion={edicion} enLaConfiguracion={enLaConfiguracion} />
      {leida?.cambio ? <Aviso tono="info">{MENSAJE_DE_LA_TABLA_QUE_CAMBIO}</Aviso> : null}
      {leida ? (
        <>
          <AvisosDelFormulario
            enLinea={guardado.enLinea}
            esperandoConexion={guardado.esperandoConexion}
            enCurso={guardado.enCurso}
            conflicto={guardado.conflicto}
            aviso={guardado.aviso}
            alReintentar={guardado.guardar}
            alRecargar={guardado.recargar}
          />
          <BarraDeLaEdicion
            cambios={edicion.cambios}
            motivo={motivo}
            enCurso={guardado.enCurso}
            trabada={guardado.conflicto !== null}
            alDescartar={guardado.descartar}
            alGuardar={guardado.guardar}
          />
        </>
      ) : null}
      <LaHojaAlDia espera={espera} />
    </div>
  )
}
