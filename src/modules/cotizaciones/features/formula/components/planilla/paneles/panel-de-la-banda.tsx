'use client'

import { useState, type ComponentType } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import type { Grupo } from '../../../../../entities/formula'
import type { ErrorDelGrupo } from '../../../../../entities/formula/grupos'
import { filaDe } from '../../../../../entities/formula/hoja-de-la-planilla'
import type { PropsDelNuevoColor } from '../../../../../entities/nuevo-color'
import {
  CLAVE_DE_LA_BANDA,
  CLAVE_DE_LA_PRIMERA_FILA,
} from '../../../hooks/use-paneles-de-la-planilla'
import type { Planilla } from '../../../hooks/use-planilla'
import { FormularioDelGrupo } from '../comunes/formulario-del-grupo'
import { SIN_MIEMBROS } from '../comunes/miembros-de-los-grupos'

const SIN_ERRORES: readonly ErrorDelGrupo[] = []

// La banda que nace: sin etiqueta, con el primer color del catálogo (si llegó) y sin tipo de cambio elegido.
const bandaNueva = (planilla: Planilla): Grupo => {
  const { estado } = planilla.bandas.tonos
  return {
    id: '',
    etiqueta: '',
    tono: estado.tipo === 'listo' ? (estado.tonos[0]?.clave ?? '') : '',
    bucket: '',
  }
}

// Lo que el panel muestra: crear (`?panel=nueva-banda&con=<fila>`, con esa fila adentro) o editar una banda (`?panel=banda&banda=<id>`); nulo si está cerrado.
function queMuestra(planilla: Planilla) {
  const { paneles, hoja, editor } = planilla
  if (paneles.nuevaBanda.abierto) {
    const con = paneles.nuevaBanda.valor(CLAVE_DE_LA_PRIMERA_FILA)
    const fila = con === null ? undefined : filaDe(hoja, hoja.numeroDe.get(con) ?? 0)
    return {
      grupo: bandaNueva(planilla),
      miembros: fila === undefined ? SIN_MIEMBROS : [{ id: fila.id, etiqueta: fila.nodo.etiqueta }],
      cerrar: paneles.nuevaBanda.cerrar,
    }
  }
  if (!paneles.banda.abierto) return null
  const id = paneles.banda.valor(CLAVE_DE_LA_BANDA)
  const grupo = editor.trabajo.definicion.grupos?.find((g) => g.id === id) ?? null
  return {
    grupo,
    miembros: planilla.bandas.miembros.get(id ?? '') ?? SIN_MIEMBROS,
    cerrar: paneles.banda.cerrar,
  }
}

// El panel de una banda (D13, D20): crear o editar su etiqueta, color (o crear uno con «+ Nuevo color»), plazo, tipo de cambio y filas, todo junto. Al aplicar se cierra y el foco vuelve a la grilla;
// un rechazo queda junto a su campo. Una banda que ya no está lo dice. El formulario lleva `key` por apertura: cada vez empieza de cero.
export function PanelDeLaBanda({
  planilla,
  NuevoColor,
}: {
  planilla: Planilla
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
}) {
  const { bandas } = planilla
  const muestra = queMuestra(planilla)
  const [errores, setErrores] = useState(SIN_ERRORES)
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(muestra !== null)
  if ((muestra !== null) !== antes) {
    setAntes(muestra !== null)
    if (muestra !== null) {
      setApertura((n) => n + 1)
      setErrores(SIN_ERRORES)
    }
  }
  const grupo = muestra?.grupo ?? null
  const nueva = grupo?.id === ''
  const cerrar = () => {
    muestra?.cerrar()
  }
  return (
    <Drawer
      abierto={muestra !== null}
      alCerrar={cerrar}
      titulo={nueva ? 'Nueva banda' : grupo === null ? 'Banda' : `Banda «${grupo.etiqueta}»`}
    >
      {muestra === null ? null : grupo === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Esa banda ya no está en la fórmula.
        </p>
      ) : (
        <FormularioDelGrupo
          key={apertura}
          grupo={grupo}
          miembros={muestra.miembros}
          candidatas={bandas.candidatas}
          errores={errores}
          tonos={bandas.tonos.estado}
          tiposDeCambio={bandas.tiposDeCambio}
          conModos={bandas.conModos}
          etiquetaDeAplicar={nueva ? 'Crear banda' : 'Aplicar'}
          alAplicar={(cambios, contexto) => {
            const r = nueva
              ? bandas.crear(cambios, contexto)
              : bandas.editar(grupo.id, cambios, contexto)
            if (r !== null) return void setErrores(r)
            muestra.cerrar()
            planilla.enfocar()
          }}
          alCancelar={cerrar}
          alReintentarTonos={bandas.tonos.reintentar}
          NuevoColor={NuevoColor}
          alCrearColor={bandas.tonos.sumar}
        />
      )}
    </Drawer>
  )
}
