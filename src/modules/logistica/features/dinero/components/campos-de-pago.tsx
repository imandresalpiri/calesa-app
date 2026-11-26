'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { Campo } from '@/shared/ui/campo'
import { CampoDeMonto } from '@/shared/ui/campo-de-monto'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import type { Pago } from '../../../entities/dinero/pago'
import { etiquetaDeTipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import type { useFormularioDePago } from '../hooks/use-formulario-de-pago'
import { CampoDeComprobante } from './campo-de-comprobante'

type Formulario = ReturnType<typeof useFormularioDePago>

type Props = {
  unidadId: string
  original: Pago | null
  opciones: OpcionesDeGasto
  formulario: Formulario
}

const TASA_CON_CUATRO_DECIMALES = 4

// Bajo el monto: el equivalente guardado de un pago que se edita (lo devolvió la base: acá nunca se multiplica) o, con otra moneda, quién lo calcula. Siempre hay un renglón reservado.
function PieDelMonto({ original, formulario: f }: Pick<Props, 'original' | 'formulario'>) {
  const { locale, monedaBase } = useRegional()
  if (f.valores.moneda === monedaBase) {
    return null
  }
  if (original && original.moneda === f.valores.moneda && original.tipoCambioAplicado !== null) {
    return (
      <>
        Equivale a <Monto valor={original.montoBase} />, a{' '}
        {formatearNumero(original.tipoCambioAplicado, {
          locale,
          decimales: TASA_CON_CUATRO_DECIMALES,
        })}
        .
      </>
    )
  }
  return `La base guarda el equivalente en ${monedaBase} con el valor de este momento.`
}

// El tipo de cambio ocupa su lugar aunque la moneda sea la base (apagado, con su motivo): elegir otra moneda no mueve lo de abajo.
function CampoDeTipoDeCambio({ formulario: f }: Pick<Props, 'formulario'>) {
  const { locale, monedaBase } = useRegional()
  const { valores, errores, enCurso, tipos } = f
  const esBase = valores.moneda === monedaBase
  return (
    <CampoSeleccion
      nombre="pago-tipo-de-cambio"
      etiqueta="Tipo de cambio"
      opciones={[
        {
          valor: '',
          etiqueta: esBase
            ? `No aplica: el pago es en ${monedaBase}`
            : tipos.length === 0
              ? 'Sin tipo de cambio activo'
              : 'Elige el tipo de cambio',
        },
        ...(esBase
          ? []
          : tipos.map((t) => ({ valor: t.id, etiqueta: etiquetaDeTipoDeCambio(t, locale) }))),
      ]}
      value={esBase ? '' : valores.tipoCambioId}
      onChange={(evento) => {
        f.escribir({ tipoCambioId: evento.target.value })
      }}
      error={errores['tipoCambioId']}
      disabled={enCurso || esBase}
    />
  )
}

function CampoDeTexto({
  clave,
  nombre,
  etiqueta,
  formulario: f,
  type,
}: {
  clave: 'concepto' | 'fecha' | 'metodo'
  nombre: string
  etiqueta: string
  formulario: Formulario
  type?: 'date'
}) {
  return (
    <Campo
      nombre={nombre}
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

// Los campos del formulario de un pago, de lo principal a lo secundario y todo a la vista: arriba el monto con su moneda (y su estado), la fecha y el concepto; luego «Cómo se pagó» (método y tipo de
// cambio), «Notas» y «Comprobante» (la zona del archivo). Un solo nivel de grupos, ninguno plegado.
export function CamposDePago({ unidadId, original, opciones, formulario: f }: Props) {
  const monedas = opciones.monedas.map((m) => ({
    valor: m.codigo,
    etiqueta: `${m.codigo} · ${m.nombre}`,
  }))
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <CampoDeMonto
          prefijo="pago"
          monedas={monedas}
          moneda={f.valores.moneda}
          monto={f.valores.monto}
          alCambiarMoneda={(moneda) => {
            f.escribir({ moneda })
          }}
          alCambiarMonto={(monto) => {
            f.escribir({ monto })
          }}
          errorDeMoneda={f.errores['moneda']}
          errorDeMonto={f.errores['monto']}
          deshabilitado={f.enCurso}
          estado={<Badge variant="outline">Sin confirmar</Badge>}
          pie={<PieDelMonto original={original} formulario={f} />}
        />
        <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <CampoDeTexto
            clave="fecha"
            nombre="pago-fecha"
            etiqueta="Fecha"
            type="date"
            formulario={f}
          />
          <CampoDeTexto
            clave="concepto"
            nombre="pago-concepto"
            etiqueta="Concepto"
            formulario={f}
          />
        </div>
      </div>
      <GrupoDeCampos titulo="Cómo se pagó">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoDeTexto clave="metodo" nombre="pago-metodo" etiqueta="Método" formulario={f} />
          <CampoDeTipoDeCambio formulario={f} />
        </div>
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Notas">
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
      <CampoDeComprobante
        unidadId={unidadId}
        ruta={f.valores.comprobanteRuta}
        alCambiar={(ruta) => {
          f.escribir({ comprobanteRuta: ruta })
        }}
        error={f.errores['comprobanteRuta']}
        deshabilitado={f.enCurso}
      />
    </div>
  )
}
