'use client'

import {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  MOTIVO_CAMPO_DE_FABRICA,
  tieneOpciones,
  tieneRango,
  type CampoBase,
  type TipoDeCampo,
} from '@/shared/lib/campos'
import { Campo } from '@/shared/ui/campo'
import { ComboDeCatalogo, type TextosDelCombo } from '@/shared/ui/combo-de-catalogo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import { CampoRango } from './campo-rango'
import { CampoValorDefecto } from './campo-valor-defecto'
import { EditorDeOpciones } from './editor-de-opciones'
import type { BanderaDeCampo, ErroresDeCampo, GruposDelEditor, ValoresDeCampo } from './tipos'

type Props = {
  valores: ValoresDeCampo
  alCambiar: (parcial: Partial<Omit<ValoresDeCampo, 'banderas' | 'textos'>>) => void
  alCambiarBandera: (clave: string, valor: boolean) => void
  // El campo que se edita, o null al crear uno.
  campo: CampoBase | null
  banderas: readonly BanderaDeCampo[]
  tipos: readonly TipoDeCampo[]
  grupos: GruposDelEditor
  errores: ErroresDeCampo
  deshabilitado: boolean
}

type PropsDeBanderas = {
  valores: ValoresDeCampo
  banderas: readonly BanderaDeCampo[]
  alCambiar: Props['alCambiar']
  alCambiarBandera: Props['alCambiarBandera']
  esNuevo: boolean
  deshabilitado: boolean
}

function Banderas(props: PropsDeBanderas) {
  const { valores, banderas, alCambiar, alCambiarBandera, esNuevo, deshabilitado } = props
  return (
    <>
      {banderas.map(({ clave, etiqueta, ayuda }) => (
        <Interruptor
          key={clave}
          titulo={etiqueta}
          ayuda={ayuda}
          valor={valores.banderas[clave] ?? false}
          alCambiar={(valor) => {
            alCambiarBandera(clave, valor)
          }}
          deshabilitado={deshabilitado}
        />
      ))}
      {esNuevo ? null : (
        <Interruptor
          titulo="Activo"
          ayuda="Desactivarlo lo saca del formulario y de los filtros; los datos ya cargados se conservan."
          valor={valores.activo}
          alCambiar={(activo) => {
            alCambiar({ activo })
          }}
          deshabilitado={deshabilitado}
        />
      )}
    </>
  )
}

const TEXTOS_DEL_COMBO: TextosDelCombo = {
  sinValor: 'Sin grupo',
  buscar: 'Buscar o crear un grupo',
  crear: (nombre) => `Crear grupo «${nombre}»`,
  vacio: 'Todavía no hay grupos. Escribe uno para crearlo.',
  existe: (nombre) => `Ya existe «${nombre}».`,
  inactivo: (nombre) => `Ya existe «${nombre}» (inactivo): actívalo en «Grupos».`,
}

type PropsDeGrupo = {
  valor: string | null
  alCambiar: (grupoId: string | null) => void
  grupos: GruposDelEditor
  error: string | undefined
  deshabilitado: boolean
}

// El grupo se elige del catálogo del layout o se crea escribiéndolo: lo que ya existe con otra escritura se ofrece en vez de duplicarlo.
function CampoGrupo({ valor, alCambiar, grupos, error, deshabilitado }: PropsDeGrupo) {
  return (
    <ComboDeCatalogo
      nombre="grupoId"
      etiqueta="Grupo"
      valor={valor}
      elementos={grupos.lista}
      hayMas={grupos.hayMas}
      textos={TEXTOS_DEL_COMBO}
      puedeCrear={grupos.puedeCrear && !deshabilitado}
      alElegir={alCambiar}
      alCrear={grupos.crear}
      ayuda="El bloque del formulario y la ficha donde va; cambiarlo lo manda al final."
      error={error}
      deshabilitado={deshabilitado}
    />
  )
}

type PropsDelValor = Pick<Props, 'valores' | 'alCambiar' | 'errores' | 'deshabilitado'>

// Lo que precarga el alta y, en un número o un monto, el rango que admite.
function ValorYRango({ valores, alCambiar, errores, deshabilitado }: PropsDelValor) {
  return (
    <>
      <CampoValorDefecto
        tipo={valores.tipo}
        opciones={valores.opciones}
        valor={valores.valorDefecto}
        alCambiar={(valorDefecto) => {
          alCambiar({ valorDefecto })
        }}
        error={errores.valorDefecto}
        deshabilitado={deshabilitado}
      />
      {tieneRango(valores.tipo) ? (
        <CampoRango
          minimo={valores.minimo}
          maximo={valores.maximo}
          alCambiar={alCambiar}
          errores={errores}
          deshabilitado={deshabilitado}
        />
      ) : null}
    </>
  )
}

// Los datos de un campo del layout. La clave sale de la etiqueta al crear y no cambia después.
export function CamposDeCampo(props: Props) {
  const { valores, alCambiar, alCambiarBandera, campo, banderas, tipos } = props
  const { grupos, errores, deshabilitado } = props
  const esNuevo = campo === null
  const tipoFijo = campo?.esSistema ?? false
  return (
    <>
      <Campo
        nombre="etiqueta"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={60}
        value={valores.etiqueta}
        onChange={(evento) => {
          alCambiar({ etiqueta: evento.target.value })
        }}
        error={errores.etiqueta ?? errores.clave}
        ayuda={
          esNuevo && valores.etiqueta.trim() === ''
            ? 'La clave interna sale del nombre y no cambia después.'
            : `Clave interna: ${valores.clave}${esNuevo ? '. No cambia después.' : '.'}`
        }
        disabled={deshabilitado}
      />
      <CampoSeleccion
        nombre="tipo"
        etiqueta="Tipo"
        opciones={tipos.map((tipo) => ({
          valor: tipo,
          etiqueta: ETIQUETA_DE_TIPO_DE_CAMPO[tipo],
        }))}
        value={valores.tipo}
        onChange={(evento) => {
          alCambiar({ tipo: evento.target.value as TipoDeCampo })
        }}
        ayuda={tipoFijo ? MOTIVO_CAMPO_DE_FABRICA : undefined}
        disabled={deshabilitado || tipoFijo}
      />
      {tieneOpciones(valores.tipo) ? (
        <EditorDeOpciones
          opciones={valores.opciones}
          alCambiar={(opciones) => {
            alCambiar({ opciones })
          }}
          error={errores.opciones}
          deshabilitado={deshabilitado}
        />
      ) : null}
      <ValorYRango
        valores={valores}
        alCambiar={alCambiar}
        errores={errores}
        deshabilitado={deshabilitado}
      />
      <CampoGrupo
        valor={valores.grupoId}
        alCambiar={(grupoId) => {
          alCambiar({ grupoId })
        }}
        grupos={grupos}
        error={errores.grupoId}
        deshabilitado={deshabilitado}
      />
      <Banderas
        valores={valores}
        banderas={banderas}
        alCambiar={alCambiar}
        alCambiarBandera={alCambiarBandera}
        esNuevo={esNuevo}
        deshabilitado={deshabilitado}
      />
    </>
  )
}
