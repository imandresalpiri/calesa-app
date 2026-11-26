'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { MOTIVO_FUERA, ordenDeLaRueda } from '../../../../entities/cola/orden-de-la-rueda'
import {
  agruparTablero,
  TEXTO_CUENTA_INACTIVA,
  TEXTO_EN_LA_RUEDA,
  TEXTO_HABILITADA_SIN_ROL,
  type FilaDelTablero,
  type Tablero,
} from '../../../../entities/cola/tablero'
import {
  ConfirmarQuitarDeLaRuedaDiferido,
  ModalDeEditarEnLaRuedaDiferido,
} from '../../rueda/components/diferidos'
import { usePanelesDeLaRueda } from '../../rueda/hooks/use-paneles-de-la-rueda'
import { REJILLA_DE_TARJETAS } from './rejilla-de-tarjetas'
import { SeccionDeLaCola } from './seccion-de-la-cola'
import { TarjetaDeLaPersona } from './tarjeta-de-la-persona'

type Props = {
  tablero: Tablero
  // Quien mira puede abrir Roles: el grupo aparte y el aviso de «Editar…» llevan el enlace.
  puedeVerRoles: boolean
  // La acción principal del bloque, junto a su título («Agregar a la rueda»).
  accion?: ReactNode
}

// «En la rueda»: quién recibe los turnos, una tarjeta por persona en rejilla, y, en sus propias secciones debajo, las habilitadas que hoy no pueden recibirlos: por su rol (ninguno tiene
// «Recibir turnos de la web») o por su cuenta. Las de la rueda van numeradas en el orden de la ruleta (`ordenDeLaRueda`, espejo de la base: el número no promete
// el próximo turno) y, al final, las que hoy no reciben uno nuevo, con su motivo. Los dos grupos aparte son secciones de la página, con su propio título, debajo de «En la rueda».
// Cada tarjeta lleva su «⋯» («Editar…» y «Quitar de la rueda»); los dos modales se piden la primera vez que se abren y viven en la URL (`?panel=…&para=`).
export function RuedaDeLaCola({ tablero, puedeVerRoles, accion }: Props) {
  const grupos = agruparTablero(tablero.filas)
  const { elegibles, fuera } = ordenDeLaRueda(grupos.rueda)
  const paneles = usePanelesDeLaRueda(tablero.filas)
  const tarjeta = (fila: FilaDelTablero, extra: { puesto?: number; motivo?: string } = {}) => (
    <TarjetaDeLaPersona
      key={fila.usuarioId}
      fila={fila}
      {...extra}
      alEditar={(elegida) => {
        paneles.editar.abrir(elegida.usuarioId)
      }}
      alQuitar={(elegida) => {
        paneles.quitar.abrir(elegida.usuarioId)
      }}
    />
  )
  return (
    <>
      <SeccionDeLaCola id="rueda-titulo" titulo={TEXTO_EN_LA_RUEDA} accion={accion}>
        {tablero.hayMas ? (
          <AvisoDeTope
            texto={`Mostrando las primeras ${formatearNumero(TOPE_DEL_EQUIPO)} habilitadas, por nombre.`}
          />
        ) : null}
        {elegibles.length === 0 && fuera.length === 0 ? (
          <EstadoVacio compacto titulo="Nadie en la rueda." />
        ) : (
          <>
            {elegibles.length > 0 ? (
              <ol className={REJILLA_DE_TARJETAS}>
                {elegibles.map((fila, i) => tarjeta(fila, { puesto: i + 1 }))}
              </ol>
            ) : null}
            {fuera.length > 0 ? (
              <ul className={REJILLA_DE_TARJETAS}>
                {fuera.map(({ fila, motivo }) =>
                  tarjeta(fila, {
                    motivo: `Hoy no recibe turnos nuevos: ${MOTIVO_FUERA[motivo]}.`,
                  }),
                )}
              </ul>
            ) : null}
          </>
        )}
      </SeccionDeLaCola>
      <GrupoAparte
        id="sin-rol-titulo"
        titulo={TEXTO_HABILITADA_SIN_ROL}
        filas={grupos.porRol}
        dibujar={tarjeta}
      >
        Están habilitadas, pero ningún rol suyo tiene «Recibir turnos de la web».{' '}
        {puedeVerRoles ? (
          <Link href={RUTAS.roles as Route} className="underline">
            Se cambia en Roles.
          </Link>
        ) : (
          'Se cambia en Roles.'
        )}
      </GrupoAparte>
      <GrupoAparte
        id="cuenta-titulo"
        titulo={TEXTO_CUENTA_INACTIVA}
        filas={grupos.porCuenta}
        dibujar={tarjeta}
      >
        Su cuenta está bloqueada o dada de baja: no recibe turnos aunque siga habilitada.
      </GrupoAparte>
      <ModalesDeLaRueda paneles={paneles} puedeVerRoles={puedeVerRoles} />
    </>
  )
}

type PropsDeModales = {
  paneles: ReturnType<typeof usePanelesDeLaRueda>
  puedeVerRoles: boolean
}

// Los dos modales de la rueda: se piden la primera vez que se abren (`montar`) y viven en la URL.
function ModalesDeLaRueda({ paneles, puedeVerRoles }: PropsDeModales) {
  return (
    <>
      {paneles.editar.montar && paneles.editar.fila ? (
        <ModalDeEditarEnLaRuedaDiferido
          abierto={paneles.editar.abierto}
          alCerrar={paneles.editar.cerrar}
          fila={paneles.editar.fila}
          sigueEnLaRueda={paneles.editar.sigue}
          puedeVerRoles={puedeVerRoles}
        />
      ) : null}
      {paneles.quitar.montar ? (
        <ConfirmarQuitarDeLaRuedaDiferido
          abierto={paneles.quitar.abierto}
          alCerrar={paneles.quitar.cerrar}
          fila={paneles.quitar.fila}
        />
      ) : null}
    </>
  )
}

type PropsDeGrupo = {
  id: string
  titulo: string
  filas: readonly FilaDelTablero[]
  dibujar: (fila: FilaDelTablero) => ReactNode
  children: ReactNode
}

// Un grupo aparte, una sección de la página como «En la rueda» (no dentro de ella), que sólo se dibuja si tiene a alguien.
function GrupoAparte({ id, titulo, filas, dibujar, children }: PropsDeGrupo) {
  if (filas.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <div className="grid gap-1">
        <h2 id={id} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
          {titulo}
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{children}</p>
      </div>
      <ul className={REJILLA_DE_TARJETAS}>{filas.map((fila) => dibujar(fila))}</ul>
    </section>
  )
}
