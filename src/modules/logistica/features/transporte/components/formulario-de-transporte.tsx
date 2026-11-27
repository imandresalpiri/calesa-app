'use client'

import { useRef } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import { MOTIVO_SIN_PERMISO_DE_TRANSPORTE } from '../../../entities/transporte/transporte'
import type { TransporteDeLaUnidad } from '../../../areas/transporte/composicion.client'
import { rutaYFechasPropias } from '../../../entities/transporte/donde-viaja'
import { useFormularioDeTransporte } from '../hooks/use-formulario-de-transporte'
import { CampoDeNotasDelTransporte, CamposDeFechas } from './campos-de-fechas'
import { CamposDeRuta } from './campos-de-ruta'
import { DondeViaja, ModalDeDondeViaja } from './donde-viaja'
import { opcionesDelFormulario } from './opciones-del-formulario'

type Props = {
  unidadId: string
  origenId: string
  datos: TransporteDeLaUnidad
  puedeEditar: boolean
  origenParaCargarNavieras: string | null
  // Vuelve a leer lo de la unidad (la versión nueva tras un conflicto).
  releer: () => void
}

type PropsDelPie = {
  conflicto: string | null
  error: string | null
  puedeEditar: boolean
  puedeGuardar: boolean
  releer: () => void
}

// El conflicto («Recargar»), el rechazo sin campo y «Guardar»; sin permiso, el motivo en vez del botón (D12).
function PieDelFormulario({ conflicto, error, puedeEditar, puedeGuardar, releer }: PropsDelPie) {
  return (
    <>
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={releer}
          detalle="No se guardó nada. Recargar trae la versión nueva y conserva lo que escribiste."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
      {puedeEditar ? (
        <div className="border-t border-(--color-line) pt-4">
          <Button type="submit" className="min-h-11 md:min-h-9" disabled={!puedeGuardar}>
            Guardar
          </Button>
        </div>
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_SIN_PERMISO_DE_TRANSPORTE}
        </p>
      )}
    </>
  )
}

// El formulario del hueco «Transporte», en grupos planos a la vista y en el orden en que se usan: «Dónde viaja» (el contenedor o el embarque con su estado y su llegada, «Elegir o
// crear»); sin embarque, «Ruta» y «Fechas» del vehículo (con embarque son las del embarque y se cambian en su página); «Notas»; el conflicto con «Recargar» y un «Guardar» que manda sólo
// lo cambiado. Sin permiso de editar, los mismos campos apagados y el motivo, sin «Guardar» (D12).
export function FormularioDeTransporte({
  unidadId,
  origenId,
  datos,
  puedeEditar,
  origenParaCargarNavieras,
  releer,
}: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDeTransporte({
    unidadId,
    transporte: datos.transporte,
    entidades: datos,
    formulario,
  })
  const opciones = opcionesDelFormulario(datos, datos.transporte)
  const apagado = f.enCurso || !puedeEditar
  const campos = {
    prefijo: `transporte-${unidadId}`,
    valores: f.valores,
    errores: f.errores,
    escribir: f.escribir,
    apagado,
  }
  // Lo que se ofrece como nuevo: si no hay ninguna naviera activa para elegir, el selector lo dice.
  const hayNavieras = datos.navieras.some((n) => n.activo)
  return (
    <>
      <form
        ref={formulario}
        onSubmit={f.guardar}
        noValidate
        className="grid gap-4"
        data-hueco="transporte"
        data-estado={datos.transporte ? 'listo' : 'vacio'}
      >
        <DondeViaja
          origenId={origenId}
          datos={datos}
          opciones={opciones}
          puedeEditar={puedeEditar}
        />
        {rutaYFechasPropias(datos) ? (
          <>
            <GrupoDeCampos titulo="Ruta">
              <CamposDeRuta
                {...campos}
                navieras={opciones.navieras}
                puertosOrigen={opciones.puertosOrigen}
                puertosDestino={opciones.puertosDestino}
                origenParaCargarNavieras={origenParaCargarNavieras}
                hayNavieras={hayNavieras}
              />
            </GrupoDeCampos>
            <GrupoDeCampos titulo="Fechas">
              <CamposDeFechas {...campos} />
            </GrupoDeCampos>
          </>
        ) : null}
        <GrupoDeCampos titulo="Notas">
          <CampoDeNotasDelTransporte {...campos} />
        </GrupoDeCampos>
        <PieDelFormulario
          conflicto={f.conflicto}
          error={f.error}
          puedeEditar={puedeEditar}
          puedeGuardar={f.hayCambios && !f.enCurso}
          releer={releer}
        />
      </form>
      {puedeEditar ? (
        <ModalDeDondeViaja unidadId={unidadId} origenId={origenId} datos={datos} releer={releer} />
      ) : null}
    </>
  )
}
