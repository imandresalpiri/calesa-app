import { Suspense, type ReactNode } from 'react'
import { origenesParaCopiar } from '@/modules/cotizaciones'
import {
  BarraDeLaFormulaDelOrigen,
  ConLaBarraDeLaFormula,
} from '@/modules/cotizaciones/pantallas/formulas-del-origen'
import { EmpezarLaFormula } from '@/modules/cotizaciones/pantallas/formulas-del-origen-empezar'
import { BotonDeLasVersiones } from '@/modules/cotizaciones/pantallas/formula-versiones'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { DrawerDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas-drawer'
import { leerOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  PANEL_DE_LAS_TABLAS,
  rutaDeLaFormula,
  unParametro,
  type ParteDeLaFormula,
} from '@/shared/lib/rutas'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import type { FormulaDeLaPestana } from './abrir-formula'
import { AvisoDeLaArchivada } from './aviso-de-la-archivada'
import { FormulaNoEncontrada } from './formula-no-encontrada'

type Props = {
  abierta: Extract<FormulaDeLaPestana, { tipo: 'abierto' }>
  parte: ParteDeLaFormula
  // La consulta de la pestaña: con `?panel=tablas`, el drawer «Tablas» lee su contenido (`?tabla=` abre una).
  consulta: Record<string, string | string[] | undefined>
  // El editor de la pestaña: se dibuja sólo con una fórmula elegida sin archivar.
  children: ReactNode
}

// Debajo de la barra: sin fórmulas, «Empezar la fórmula» (con el Modo Live, sólo el vacío); con una archivada, su aviso; si no, el editor de la pestaña.
function CuerpoDeLaFormula({
  abierta,
  parte,
  paraCopiar,
  children,
}: Pick<Props, 'abierta' | 'parte' | 'children'> & {
  paraCopiar: readonly { id: string; nombre: string }[]
}) {
  const { id, nombre } = abierta.origen
  const { elegida, soloLectura } = abierta
  if (elegida === null) {
    return soloLectura ? (
      <EstadoVacio titulo="Este origen todavía no tiene fórmulas." />
    ) : (
      <EmpezarLaFormula origen={{ id, nombre }} origenesParaCopiar={paraCopiar} />
    )
  }
  if (abierta.archivada) {
    return (
      <AvisoDeLaArchivada
        origenId={id}
        formulaId={elegida.id}
        parte={parte}
        soloLectura={soloLectura}
      />
    )
  }
  return children
}

// Lo común a Planilla, Hoja y Tarjeta: la barra de la fórmula (con «Versiones» y el drawer «Tablas») y, debajo, el editor de la pestaña (que lleva sus botones a la barra). Sin fórmulas, «Empezar la
// fórmula»; con una archivada, su aviso; con una pedida que no se abrió, el aviso arriba y la de trabajo. Los orígenes (de cuáles se copia) se leen una vez por
// request (`leerOrigenes()`). Con el Modo Live (`soloLectura`), la barra sólo elige qué fórmula ver: sin «Versiones», «Tablas» ni «Empezar la fórmula».
export async function MarcoDeLaFormula({ abierta, parte, consulta, children }: Props) {
  const { id, nombre, activo } = abierta.origen
  const { soloLectura } = abierta
  const origenes = datosO(await leerOrigenes()).map((otro) => ({
    id: otro.id,
    nombre: otro.nombre,
  }))
  const paraCopiar = origenesParaCopiar(origenes, abierta.sesion.permisos, id).map((otro) => ({
    id: otro.id,
    nombre: otro.nombre,
  }))
  const { elegida } = abierta
  const conTablas = unParametro(consulta[CLAVE_DE_PANEL]) === PANEL_DE_LAS_TABLAS
  const tablaPedida = unParametro(consulta['tabla'])
  // Las tablas se leen sólo con el drawer abierto; sus URL vuelven a esta pestaña con esta fórmula.
  const tablas = (
    <DrawerDeLasTablas>
      {conTablas ? (
        <Suspense key={tablaPedida ?? ''} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
          <SeccionDeLasTablas
            destino={{
              origen: { id, nombre, activo },
              en: rutaDeLaFormula(id, elegida?.id ?? null, parte),
            }}
            tablaPedida={tablaPedida}
          />
        </Suspense>
      ) : null}
    </DrawerDeLasTablas>
  )
  return (
    <ConLaBarraDeLaFormula>
      <div className="grid min-w-0 gap-4">
        <BarraDeLaFormulaDelOrigen
          origen={{ id, nombre }}
          parte={parte}
          elegida={elegida}
          lectura={abierta.lectura}
          origenesParaCopiar={paraCopiar}
          versiones={
            elegida && !abierta.archivada && !soloLectura ? (
              <BotonDeLasVersiones origenId={id} formulaId={elegida.id} parte={parte} />
            ) : null
          }
          tablas={soloLectura ? null : tablas}
          soloLectura={soloLectura}
        />
        {abierta.ignorada ? <FormulaNoEncontrada /> : null}
        <CuerpoDeLaFormula abierta={abierta} parte={parte} paraCopiar={paraCopiar}>
          {children}
        </CuerpoDeLaFormula>
      </div>
    </ConLaBarraDeLaFormula>
  )
}
