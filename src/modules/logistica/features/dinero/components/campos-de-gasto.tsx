'use client'

import Link from 'next/link'
import { rutaDeUnCatalogo } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Campo } from '@/shared/ui/campo'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import { categoriasParaElegir } from '../../../entities/dinero/categoria'
import type { Gasto } from '../../../entities/dinero/gasto'
import type { useFormularioDeGasto } from '../hooks/use-formulario-de-gasto'
import { CampoDeComprobante } from './campo-de-comprobante'
import { CampoDeTipoDeCambio } from './campo-de-tipo-de-cambio'
import { MontoDelFormulario } from './monto-del-formulario'

type Formulario = ReturnType<typeof useFormularioDeGasto>

type Props = {
  unidadId: string
  // El origen de la unidad: sus categorías y, sin ninguna, a dónde ir a cargarlas.
  origenId: string
  original: Gasto | null
  // Nulas mientras se leen.
  opciones: OpcionesDeGasto | null
  formulario: Formulario
  // `logistica.catalogos.gestionar` en el origen: sin categorías, el enlace a cargarlas.
  puedeGestionarCategorias: boolean
}

export const SIN_CATEGORIAS_DE_GASTO = 'Este origen no tiene categorías de gasto activas.'

// La categoría del origen o, sin ninguna activa, por qué no se puede registrar y a dónde ir (o a quién pedírselo).
function CategoriaDelGasto({
  origenId,
  original,
  opciones,
  formulario: f,
  puedeGestionarCategorias,
}: Omit<Props, 'unidadId'>) {
  const categorias = opciones
    ? categoriasParaElegir(
        opciones.categorias,
        original ? { id: original.categoriaId, nombre: original.categoriaNombre } : null,
        opciones.origenes,
      )
    : []
  if (opciones !== null && categorias.length === 0) {
    return (
      <Aviso tono="aviso">
        <p data-estado="sin-categorias">
          {SIN_CATEGORIAS_DE_GASTO}{' '}
          {puedeGestionarCategorias ? (
            <Link
              href={rutaDeUnCatalogo(origenId, 'categorias-de-gasto')}
              className="font-medium text-(--color-ink) underline underline-offset-2"
            >
              Cargar categorías
            </Link>
          ) : (
            'Pídeselo a quien configura la logística.'
          )}
        </p>
      </Aviso>
    )
  }
  return (
    <CampoSeleccion
      nombre="gasto-categoria"
      etiqueta="Categoría"
      opciones={[{ valor: '', etiqueta: 'Elige una categoría' }, ...categorias]}
      value={f.valores.categoriaId}
      onChange={(evento) => {
        f.escribir({ categoriaId: evento.target.value })
      }}
      error={f.errores['categoriaId']}
      disabled={f.enCurso || opciones === null}
    />
  )
}

// Los campos de un gasto, de lo principal a lo secundario y todo a la vista: el monto con su moneda, la categoría, la fecha y el comprobante; debajo, «Más datos» (tipo de cambio,
// proveedor y notas), un grupo plano que nunca se pliega.
export function CamposDeGasto(props: Props) {
  const { unidadId, original, opciones, formulario: f } = props
  return (
    <div className="grid min-w-0 gap-4">
      <MontoDelFormulario prefijo="gasto" opciones={opciones} original={original} formulario={f} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <CategoriaDelGasto {...props} />
        <Campo
          nombre="gasto-fecha"
          etiqueta="Fecha"
          type="date"
          value={f.valores.fecha}
          onChange={(evento) => {
            f.escribir({ fecha: evento.target.value })
          }}
          error={f.errores['fecha']}
          disabled={f.enCurso}
        />
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
          <CampoDeTipoDeCambio prefijo="gasto" formulario={f} />
          <Campo
            nombre="gasto-proveedor"
            etiqueta="Proveedor"
            autoComplete="off"
            value={f.valores.proveedor}
            onChange={(evento) => {
              f.escribir({ proveedor: evento.target.value })
            }}
            error={f.errores['proveedor']}
            disabled={f.enCurso}
          />
        </div>
        <CampoDeNotas
          nombre="gasto-notas"
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
