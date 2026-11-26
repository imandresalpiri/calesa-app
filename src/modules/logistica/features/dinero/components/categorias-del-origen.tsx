'use client'

import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import {
  leerCategoriasDelOrigen,
  NO_SE_CARGARON_LAS_CATEGORIAS,
} from '../../../areas/dinero/composicion.client'
import {
  textoDeUsoDeCategoria,
  TOPE_DE_CATEGORIAS_DE_GASTO,
  type CategoriaDeGasto,
} from '../../../entities/dinero/categoria'
import { MENSAJE_CATEGORIA_YA_NO_ESTA } from '../../../entities/dinero/paneles'
import {
  NOMBRE_DE_CATEGORIA,
  type PropsDelCatalogoDelOrigen,
} from '../../../entities/nucleo/catalogo-del-origen'
import { CatalogoDelOrigen } from '../../nucleo/components/catalogo-del-origen'
import type { ConfigDelCatalogo } from '../../nucleo/hooks/use-catalogo-del-origen'
import { useDrawerDelCatalogo } from '../../nucleo/hooks/use-drawer-del-catalogo'
import { guardarCategoria } from '../actions/guardar-categoria'
import { PANELES_DE_CATEGORIA } from '../hooks/paneles-de-categoria'
import { ModalDeCategoriaDiferido } from './diferidos-de-categorias'
import { filasDeCategorias } from './filas-de-categorias'

const CONFIG: ConfigDelCatalogo<CategoriaDeGasto> = {
  leer: leerCategoriasDelOrigen,
  mensajeDeLectura: NO_SE_CARGARON_LAS_CATEGORIAS,
  activar: (categoria, activo) =>
    enviarAccion(
      guardarCategoria({
        id: categoria.id,
        actualizadoEn: categoria.actualizadoEn,
        cambios: { activo },
      }),
      'No se pudo guardar la categoría.',
    ),
  avisoActivado: 'Categoría activada.',
  avisoDesactivado: 'Categoría desactivada.',
  avisoDelUso: (categoria, uso) => textoDeUsoDeCategoria(categoria.nombre, uso),
}

const claveDe = (categoria: CategoriaDeGasto) => claveDeCatalogo(categoria.nombre)

// El drawer «Categorías de gasto» de las fases de un origen (`?panel=categorias-de-gasto`, 6.11-4): las de ese origen y las compartidas con todos, que se
// crean, renombran, eligen su propósito, ordenan (con un número), activan y desactivan; no se eliminan (desactivar una con gastos avisa cuántos la usan).
// Escribir pide `logistica.catalogos.gestionar` en el origen (la action y, por RPC, la base).
export function CategoriasDelOrigen({ origen, puedeCambiar }: PropsDelCatalogoDelOrigen) {
  const { datos, modal, montar, contexto } = useDrawerDelCatalogo({
    origen,
    puedeCambiar,
    config: CONFIG,
    paneles: PANELES_DE_CATEGORIA,
    nombre: NOMBRE_DE_CATEGORIA,
    yaNoEsta: MENSAJE_CATEGORIA_YA_NO_ESTA,
    claveDe,
  })
  return (
    <CatalogoDelOrigen
      prefijo="categoria-de-gasto"
      nombre={NOMBRE_DE_CATEGORIA}
      origen={origen.nombre}
      puedeCambiar={puedeCambiar}
      columnaDeUso="Propósito"
      tope={TOPE_DE_CATEGORIAS_DE_GASTO}
      lectura={datos.lectura}
      filas={(lista) =>
        filasDeCategorias(
          lista,
          {
            alEditar: modal.abrirEdicion,
            alActivar: (categoria, activo) => void datos.activar(categoria, activo),
          },
          contexto,
        )
      }
      alNuevo={() => {
        modal.abrirNuevo()
      }}
      alAbrir={modal.abrirEdicion}
      alReintentar={datos.reintentar}
    >
      {montar ? (
        <ModalDeCategoriaDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={datos.recargar}
          origen={origen}
          paraInicial={modal.para}
        />
      ) : null}
    </CatalogoDelOrigen>
  )
}
