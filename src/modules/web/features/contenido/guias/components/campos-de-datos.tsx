'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Bloque } from '@/shared/ui/bloque'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ComboDeCatalogo, type TextosDelCombo } from '@/shared/ui/combo-de-catalogo'
import { textoDelTope } from '@/shared/lib/conteo'
import { Campo } from '@/shared/ui/campo'
import { MAXIMO_DEL_NOMBRE_DE_CATEGORIA } from '../../../../entities/contenido/categorias'
import {
  MAXIMO_DEL_SLUG_DE_GUIA,
  TOPE_DE_OPCIONES_DE_GUIA,
  type OpcionesDeGuia,
} from '../../../../entities/contenido/guias'
import { useCategoriasDeGuia } from '../hooks/use-categorias-de-guia'
import type { ErroresDeGuia } from '../hooks/use-guardar-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'
import { CampoDePortada } from './campo-de-portada'
import { CampoDeResumen } from './campo-de-resumen'

type Props = {
  valores: ValoresDeGuia
  cambiar: (cambios: Partial<ValoresDeGuia>) => void
  errores: ErroresDeGuia
  opciones: OpcionesDeGuia
  deshabilitado: boolean
}

const TEXTOS_DEL_COMBO: TextosDelCombo = {
  sinValor: 'Sin categoría',
  buscar: 'Buscar o crear una categoría',
  crear: (nombre) => `Crear categoría «${nombre}»`,
  vacio: 'Todavía no hay categorías. Escribe una para crearla.',
  existe: (nombre) => `Ya existe «${nombre}».`,
  inactivo: (nombre) => `Ya existe «${nombre}» (inactiva): actívala en «Categorías», en Guías.`,
}

// Dirección, resumen, categoría (del catálogo, o creada aquí), autor y portada. Las listas se leyeron con tope + 1: si hay más, lo dice.
export function CamposDeDatos({ valores, cambiar, errores, opciones, deshabilitado }: Props) {
  const categorias = useCategoriasDeGuia(opciones)
  return (
    <Bloque titulo="Datos" descripcion="Cómo se clasifica y se presenta la guía en el sitio.">
      <Campo
        nombre="slug"
        etiqueta="Dirección"
        ayuda={`Es la dirección de la guía en el sitio: /guias/${valores.slug || '…'}. Si ya está publicada, cambiarla rompe los enlaces que la nombran.`}
        maxLength={MAXIMO_DEL_SLUG_DE_GUIA}
        autoComplete="off"
        value={valores.slug}
        onChange={(evento) => {
          cambiar({ slug: evento.target.value })
        }}
        error={errores['slug']}
      />
      <CampoDeResumen
        valor={valores.resumen}
        alCambiar={(resumen) => {
          cambiar({ resumen })
        }}
        error={errores['resumen']}
      />
      <ComboDeCatalogo
        nombre="categoriaId"
        etiqueta="Categoría"
        valor={valores.categoriaId === '' ? null : valores.categoriaId}
        elementos={categorias.elementos}
        hayMas={categorias.hayMas}
        textos={TEXTOS_DEL_COMBO}
        maximoDelNombre={MAXIMO_DEL_NOMBRE_DE_CATEGORIA}
        puedeCrear={!deshabilitado}
        alElegir={(categoriaId) => {
          cambiar({ categoriaId: categoriaId ?? '' })
        }}
        alCrear={categorias.crear}
        ayuda="Elige una o créala aquí."
        error={errores['categoriaId']}
        deshabilitado={deshabilitado}
      />
      <CampoSeleccion
        nombre="autorId"
        etiqueta="Autor"
        opciones={[
          { valor: '', etiqueta: 'Sin autor' },
          ...opciones.autores.map((a) => ({ valor: a.id, etiqueta: a.nombre })),
        ]}
        ayuda="Su nombre sólo se ve en la web si su perfil es público."
        value={valores.autorId}
        onChange={(evento) => {
          cambiar({ autorId: evento.target.value })
        }}
        error={errores['autorId']}
      />
      {opciones.hayMasAutores ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_OPCIONES_DE_GUIA, {
            sustantivo: 'personas',
            articulo: 'las',
            orden: 'primeras por nombre',
          })}
        />
      ) : null}
      <CampoDePortada
        ruta={valores.portadaRuta}
        alCambiar={(portadaRuta) => {
          cambiar({ portadaRuta })
        }}
        deshabilitado={deshabilitado}
      />
      {errores['portadaRuta'] ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {errores['portadaRuta']}
        </p>
      ) : null}
    </Bloque>
  )
}
