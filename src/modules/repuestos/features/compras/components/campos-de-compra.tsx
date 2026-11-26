'use client'

import { Badge } from '@/shared/ui/badge'
import { Campo } from '@/shared/ui/campo'
import { CampoDeMonto } from '@/shared/ui/campo-de-monto'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import type { BorradorDeCompra } from '../../../entities/compras/formulario'
import type { useFormularioDeCompra } from '../hooks/use-formulario-de-compra'
import { CampoDeComprobante } from './campo-de-comprobante'

// Lo que el formulario ofrece para elegir: los ítems vivos de la hoja que ya leyó la página y las monedas activas (D4, D5).
export type ItemParaCompra = { id: string; descripcion: string }
export type MonedaParaCompra = { codigo: string; nombre: string }

type Props = {
  proyectoId: string
  original: FilaDeCompra | null
  items: readonly ItemParaCompra[]
  monedas: readonly MonedaParaCompra[]
  formulario: ReturnType<typeof useFormularioDeCompra>
}

// Un ítem de la compra que ya no está en la hoja se suma con su descripción, para no perderlo al editar (D4).
function opcionesDeItem(items: readonly ItemParaCompra[], original: FilaDeCompra | null) {
  const opciones = [
    { valor: '', etiqueta: 'Sin ítem' },
    ...items.map((i) => ({ valor: i.id, etiqueta: i.descripcion })),
  ]
  if (original?.itemId && !items.some((i) => i.id === original.itemId)) {
    opciones.push({
      valor: original.itemId,
      etiqueta: original.itemDescripcion ?? 'Ítem eliminado',
    })
  }
  return opciones
}

// La moneda de la compra que se edita, aunque ya no esté activa: si no se cambia, no viaja y la base conserva la tasa (D5).
function opcionesDeMoneda(monedas: readonly MonedaParaCompra[], original: FilaDeCompra | null) {
  const opciones = monedas.map((m) => ({ valor: m.codigo, etiqueta: `${m.codigo} · ${m.nombre}` }))
  if (original && !monedas.some((m) => m.codigo === original.moneda)) {
    opciones.push({ valor: original.moneda, etiqueta: original.moneda })
  }
  return opciones
}

type ClaveDeTexto = 'proveedor' | 'fecha'

function CampoDeTexto(p: {
  clave: ClaveDeTexto
  etiqueta: string
  formulario: Props['formulario']
  type?: 'date'
}) {
  const f = p.formulario
  return (
    <Campo
      nombre={`compra-${p.clave}`}
      etiqueta={p.etiqueta}
      type={p.type}
      autoComplete="off"
      value={f.valores[p.clave]}
      onChange={(evento) => {
        f.escribir({ [p.clave]: evento.target.value } as Partial<BorradorDeCompra>)
      }}
      error={f.errores[p.clave]}
      disabled={f.enCurso}
    />
  )
}

// Bajo el monto: el equivalente que ya guardó la base (se lee, nunca se calcula) o, con otra moneda, quién lo calcula. Siempre hay un renglón reservado.
function PieDelMonto({ original, moneda }: { original: FilaDeCompra | null; moneda: string }) {
  const { monedaBase } = useRegional()
  if (moneda === monedaBase) {
    return null
  }
  if (original && original.moneda === moneda && original.montoBase !== null) {
    return (
      <>
        Equivale a <Monto valor={original.montoBase} />, con el tipo de cambio por defecto.
      </>
    )
  }
  return `La base guarda el equivalente en ${monedaBase} con el tipo de cambio por defecto.`
}

// Los campos de una compra, de lo principal a lo secundario y todo a la vista: arriba el monto con su moneda (y su estado), la fecha y el proveedor; luego «Qué se compró» (el ítem), «Notas» y «Comprobante de
// la compra» (la zona del archivo). Sin tipo de cambio: lo pone la base al guardar. Un solo nivel de grupos, ninguno plegado.
export function CamposDeCompra({ proyectoId, original, items, monedas, formulario: f }: Props) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <CampoDeMonto
          prefijo="compra"
          monedas={opcionesDeMoneda(monedas, original)}
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
          estado={<Badge variant="outline">{original ? 'Registrada' : 'Sin registrar'}</Badge>}
          pie={<PieDelMonto original={original} moneda={f.valores.moneda} />}
        />
        <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <CampoDeTexto clave="fecha" etiqueta="Fecha" type="date" formulario={f} />
          <CampoDeTexto clave="proveedor" etiqueta="Proveedor" formulario={f} />
        </div>
      </div>
      <GrupoDeCampos titulo="Qué se compró">
        <CampoSeleccion
          nombre="compra-item"
          etiqueta="Ítem"
          opciones={opcionesDeItem(items, original)}
          value={f.valores.itemId}
          onChange={(evento) => {
            f.escribir({ itemId: evento.target.value })
          }}
          error={f.errores['itemId']}
          disabled={f.enCurso}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Notas">
        <CampoDeNotas
          nombre="compra-notas"
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
        proyectoId={proyectoId}
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
