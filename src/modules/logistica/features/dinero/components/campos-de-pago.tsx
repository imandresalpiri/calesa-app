'use client'

import { Badge } from '@/shared/ui/badge'
import { Campo } from '@/shared/ui/campo'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import type { Pago } from '../../../entities/dinero/pago'
import type { useFormularioDePago } from '../hooks/use-formulario-de-pago'
import { CampoDeComprobante } from './campo-de-comprobante'
import { CampoDeTipoDeCambio } from './campo-de-tipo-de-cambio'
import { MontoDelFormulario } from './monto-del-formulario'

type Formulario = ReturnType<typeof useFormularioDePago>

type Props = {
  unidadId: string
  original: Pago | null
  // Nulas mientras se leen.
  opciones: OpcionesDeGasto | null
  formulario: Formulario
}

function CampoDeTexto({
  clave,
  etiqueta,
  formulario: f,
  type,
}: {
  clave: 'concepto' | 'fecha' | 'metodo'
  etiqueta: string
  formulario: Formulario
  type?: 'date'
}) {
  return (
    <Campo
      nombre={`pago-${clave}`}
      etiqueta={etiqueta}
      type={type}
      autoComplete="off"
      value={f.valores[clave]}
      onChange={(evento) => {
        f.escribir({ [clave]: evento.target.value })
      }}
      error={f.errores[clave]}
      disabled={f.enCurso}
    />
  )
}

// Los campos de un pago, de lo principal a lo secundario y todo a la vista: el monto con su moneda (y su estado), la fecha y el concepto (la base lo pide y nombra al pago en su fila y
// sus diálogos) y el comprobante; debajo, «Más datos» (método, tipo de cambio y notas), un grupo plano que nunca se pliega.
export function CamposDePago({ unidadId, original, opciones, formulario: f }: Props) {
  return (
    <div className="grid min-w-0 gap-4">
      <MontoDelFormulario
        prefijo="pago"
        opciones={opciones}
        original={original}
        formulario={f}
        estado={<Badge variant="outline">Sin confirmar</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <CampoDeTexto clave="fecha" etiqueta="Fecha" type="date" formulario={f} />
        <CampoDeTexto clave="concepto" etiqueta="Concepto" formulario={f} />
      </div>
      <CampoDeComprobante
        unidadId={unidadId}
        ruta={f.valores.comprobanteRuta}
        alCambiar={(ruta) => {
          f.escribir({ comprobanteRuta: ruta })
        }}
        error={f.errores['comprobanteRuta']}
        deshabilitado={f.enCurso}
      />
      <GrupoDeCampos titulo="Más datos">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoDeTexto clave="metodo" etiqueta="Método" formulario={f} />
          <CampoDeTipoDeCambio prefijo="pago" formulario={f} />
        </div>
        <CampoDeNotas
          nombre="pago-notas"
          etiqueta="Notas"
          value={f.valores.notas}
          onChange={(evento) => {
            f.escribir({ notas: evento.target.value })
          }}
          error={f.errores['notas']}
          disabled={f.enCurso}
        />
      </GrupoDeCampos>
    </div>
  )
}
