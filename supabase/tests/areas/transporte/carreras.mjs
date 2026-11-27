// Las carreras del transporte (paso 6.07-1, C20), con conexiones reales a la base del Supabase LOCAL. Ninguna termina en 40P01 ni deja un embarque a medias.
// La ETA es del embarque y la cambia para sus tres unidades (`embarque_guardar`, que toma sus unidades); las notas son de cada unidad.
//   K1. A guarda las notas de una unidad del embarque de 3 sin confirmar; B guarda la ETA del embarque con su versión: espera la unidad y, cuando A
//       confirma, pasa (las notas no son del embarque); las 3 con la ETA de B y las notas, las de A.
//   K2. A guarda la ETA del embarque sin confirmar; B guarda otra ETA desde una unidad con las versiones de antes: espera el embarque y PT409; las 3
//       quedan con lo de A.
//   K3. Dos unidades Ua < Ub por id de vehículo con sus transportes al revés (Tb < Ta). X tiene Ub tomada; guardar el embarque y `cambiar_fase_lote`
//       de las dos esperan, en los dos órdenes, y al soltar X pasan los dos: las unidades se toman en el orden de los vehículos, nunca en el de
//       `transportes.id`.
//   K4. A vacía el contenedor sin confirmar y B mueve la unidad a una fase que lo exige: B espera y, cuando A confirma, no entra (23514). Al revés: B
//       mueve primero y A, al vaciar, espera y recibe 23514; el contenedor sigue.
//   K5. Dos personas ponen el mismo vehículo en contenedores distintos con la misma versión: una pasa y la otra espera la fila y da PT409; el
//       vehículo queda en el de la primera y el de la segunda no existe.
//   K6. Dos `transporte_guardar` crean a la vez el mismo booking nuevo en el mismo origen (dos vehículos): la segunda espera el índice único y se
//       suma al embarque de la primera; queda un solo embarque, con los dos. Dos `embarque_crear` con ids distintos y el mismo booking: el segundo
//       espera el índice único y da 23505; queda uno.
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`) y, solas, `correr-carreras.mjs`. Terreno con el prefijo «Carreras»: el rol, los vehículos (con
// sus transportes) y el origen los borra `limpiar()` de `scripts/carreras/terreno.mjs`; el historial y las notas de los movimientos, `limpiarTransporte()`.
import {
  armarCarrera,
  armarTrabada,
  embarqueDe,
  fila,
  limpiarTransporte,
  sinInterbloqueo,
  terrenoTransporte,
  unidad,
  versionDe,
} from './carreras-comun.mjs'

export { limpiarTransporte }

export async function carrerasDeTransporte({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  const trabada = armarTrabada({ orquesta, conectar, esperarBloqueo })
  await limpiarTransporte(orquesta)
  const t = await terrenoTransporte(orquesta)
  // `embarque` es el de `embarqueDe()`: su id y la versión leída antes de la carrera.
  const guardarEmbarque = (embarque, cambios) => ({
    sql: `public.embarque_guardar($1, $2::timestamptz, $3::jsonb)::text`,
    args: [embarque.id, embarque.version, JSON.stringify(cambios)],
  })
  // `version` es la de `versionDe()`: la fila, su embarque y su contenedor.
  const guardar = (v, version, cambios) => ({
    sql: `public.transporte_guardar($1, null, $2::timestamptz, $3::jsonb, $4::timestamptz, $5::timestamptz)::text`,
    args: [v, version.fila, JSON.stringify(cambios), version.embarque, version.contenedor],
  })
  const etas = async (booking) =>
    (
      await orquesta.query(
        `select coalesce(eta_el::text, '-') as e from public.transportes_con_embarque where booking = $1 order by id`,
        [booking],
      )
    ).rows.map((r) => r.e)
  const notas = async (booking) =>
    (
      await orquesta.query(
        `select coalesce(notas, '-') as n from public.transportes_con_embarque where booking = $1 order by id`,
        [booking],
      )
    ).rows.map((r) => r.n)

  console.log('Guardar el embarque contra guardar una unidad')
  {
    const vs = []
    for (const n of [1, 2, 3])
      vs.push(await unidad(orquesta, t, { n: `k1 ${n}`, booking: 'CARR-K1' }))
    const embarque = await embarqueDe(orquesta, 'CARR-K1')
    const { a, b } = await carrera({
      a: guardar(vs[1], await versionDe(orquesta, vs[1]), { notas: 'de A' }),
      b: guardarEmbarque(embarque, { eta_el: '2026-12-24' }),
    })
    const e = await etas('CARR-K1')
    const n = await notas('CARR-K1')
    espero(
      'K1: A guarda las notas de una unidad; B guarda la ETA del embarque, espera y pasa; las 3 con la ETA y las notas de A; sin 40P01',
      a.ok &&
        b.ok &&
        e.every((x) => x === '2026-12-24') &&
        n.filter((x) => x === 'de A').length === 1 &&
        n.filter((x) => x === '-').length === 2 &&
        sinInterbloqueo(a, b),
      { a, b, e, n },
    )
  }
  {
    const vs = []
    for (const n of [1, 2, 3])
      vs.push(await unidad(orquesta, t, { n: `k2 ${n}`, booking: 'CARR-K2' }))
    const embarque = await embarqueDe(orquesta, 'CARR-K2')
    const vieja = await versionDe(orquesta, vs[2])
    const { a, b } = await carrera({
      a: guardarEmbarque(embarque, { eta_el: '2026-12-24' }),
      b: guardar(vs[2], vieja, { eta_el: '2026-12-01' }),
    })
    const e = await etas('CARR-K2')
    espero(
      'K2: A guarda la ETA del embarque; B guarda otra desde una unidad, espera el embarque y da PT409; las 3 con lo de A; sin 40P01',
      a.ok && b.codigo === 'PT409' && e.every((x) => x === '2026-12-24') && sinInterbloqueo(a, b),
      { a, b, e },
    )
  }

  console.log(
    'Guardar el embarque contra mover un lote, con las unidades y sus transportes en órdenes opuestos',
  )
  {
    const ua = '00000000-0000-4000-8000-0000000e0701'
    const ub = '00000000-0000-4000-8000-0000000e0702'
    await unidad(orquesta, t, {
      n: 'k3 a',
      booking: 'CARR-K3',
      id: ua,
      transporte: '00000000-0000-4000-8000-0000000f0702',
    })
    await unidad(orquesta, t, {
      n: 'k3 b',
      booking: 'CARR-K3',
      id: ub,
      transporte: '00000000-0000-4000-8000-0000000f0701',
    })
    const lote = (de, a) => ({
      sql: `public.cambiar_fase_lote($1::jsonb, $2, null)::text`,
      args: [JSON.stringify([ua, ub].map((vehiculo) => ({ vehiculo, fase_esperada: de }))), a],
    })
    const r1 = await trabada({
      bloqueada: ub,
      a: lote(t.uno, t.tres),
      b: guardarEmbarque(await embarqueDe(orquesta, 'CARR-K3'), { eta_el: '2026-12-01' }),
    })
    const movidos1 = r1.a.ok && JSON.parse(r1.a.valor).every((u) => u.ok === true)
    espero(
      'K3 (lote primero): el lote y el embarque esperan a X y pasan los dos; sin 40P01',
      movidos1 && r1.b.ok && sinInterbloqueo(r1.a, r1.b),
      r1,
    )
    const r2 = await trabada({
      bloqueada: ub,
      a: guardarEmbarque(await embarqueDe(orquesta, 'CARR-K3'), { eta_el: '2026-12-24' }),
      b: lote(t.tres, t.uno),
    })
    const movidos2 = r2.b.ok && JSON.parse(r2.b.valor).every((u) => u.ok === true)
    espero(
      'K3 (embarque primero): el embarque y el lote esperan a X y pasan los dos; sin 40P01',
      r2.a.ok && movidos2 && sinInterbloqueo(r2.a, r2.b),
      r2,
    )
  }

  console.log('Vaciar el contenedor contra mover a una fase que lo exige')
  {
    const v = await unidad(orquesta, t, { n: 'k4 a', contenedor: 'CARRK4' })
    const mover = {
      sql: `public.cambiar_fase($1, null, $2, null, $3)::text`,
      args: [v, t.pide, t.uno],
    }
    const { a, b } = await carrera({
      a: guardar(v, await versionDe(orquesta, v), { contenedor: null }),
      b: mover,
    })
    const { fase_id } = await fila(orquesta, `select fase_id from public.vehiculos where id = $1`, [
      v,
    ])
    espero(
      'K4 (vaciar primero): A vacía; B espera la unidad y, con el contenedor vacío, no entra (23514); sin 40P01',
      a.ok && b.codigo === '23514' && fase_id === t.uno && sinInterbloqueo(a, b),
      { a, b, fase_id },
    )
  }
  {
    const v = await unidad(orquesta, t, { n: 'k4 b', contenedor: 'CARRK4' })
    const vieja = await versionDe(orquesta, v)
    const { a, b } = await carrera({
      a: { sql: `public.cambiar_fase($1, null, $2, null, $3)::text`, args: [v, t.pide, t.uno] },
      b: guardar(v, vieja, { contenedor: null }),
    })
    const { contenedor } = await fila(
      orquesta,
      `select contenedor from public.transportes_con_embarque where vehiculo_id = $1`,
      [v],
    )
    espero(
      'K4 (mover primero): A mueve; B espera la unidad y, al vaciar lo que la fase ahora exige, da 23514; sin 40P01',
      a.ok &&
        b.codigo === '23514' &&
        b.mensaje?.includes('exige') &&
        contenedor === 'CARRK4' &&
        sinInterbloqueo(a, b),
      { a, b, contenedor },
    )
  }

  console.log('Dos personas ponen el mismo vehículo en contenedores distintos')
  {
    const v = await unidad(orquesta, t, { n: 'k5' })
    const vieja = await versionDe(orquesta, v)
    const { a, b } = await carrera({
      a: guardar(v, vieja, { contenedor: 'CARRK5A' }),
      b: guardar(v, vieja, { contenedor: 'CARRK5B' }),
    })
    const { contenedor } = await fila(
      orquesta,
      `select contenedor from public.transportes_con_embarque where vehiculo_id = $1`,
      [v],
    )
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.contenedores where origen_id = $1 and numero = 'CARRK5B'`,
      [t.origen],
    )
    espero(
      'K5: A lo pone en un contenedor; B, con la misma versión, espera la fila y da PT409; queda en el de A y el de B no existe; sin 40P01',
      a.ok && b.codigo === 'PT409' && contenedor === 'CARRK5A' && n === 0 && sinInterbloqueo(a, b),
      { a, b, contenedor, n },
    )
  }

  console.log('Dos guardados crean a la vez el mismo booking nuevo')
  {
    const v1 = await unidad(orquesta, t, { n: 'k6 1' })
    const v2 = await unidad(orquesta, t, { n: 'k6 2' })
    const { a, b } = await carrera({
      a: guardar(v1, await versionDe(orquesta, v1), { booking: 'CARR-K6' }),
      b: guardar(v2, await versionDe(orquesta, v2), { booking: 'CARR-K6' }),
    })
    const { embarques, unidades } = await fila(
      orquesta,
      `select (select count(*)::int from public.embarques e where e.origen_id = $1 and e.booking = 'CARR-K6') as embarques,
              (select count(*)::int from public.transportes t join public.embarques e on e.id = t.embarque_id
                where e.origen_id = $1 and e.booking = 'CARR-K6' and t.vehiculo_id = any ($2::uuid[])) as unidades`,
      [t.origen, [v1, v2]],
    )
    espero(
      'K6: los dos crean el mismo booking; B espera el índice único y se suma: un solo embarque con los dos; sin 40P01',
      a.ok && b.ok && embarques === 1 && unidades === 2 && sinInterbloqueo(a, b),
      { a, b, embarques, unidades },
    )
  }

  console.log('Dos embarque_crear con el mismo booking')
  {
    const crear = (id) => ({
      sql: `public.embarque_crear($1::uuid, $2::uuid, '{"booking": "CARR-K6B"}'::jsonb)::text`,
      args: [id, t.origen],
    })
    const { a, b } = await carrera({ a: crear(crypto.randomUUID()), b: crear(crypto.randomUUID()) })
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.embarques where origen_id = $1 and booking = 'CARR-K6B'`,
      [t.origen],
    )
    espero(
      'K6: dos embarque_crear con ids distintos y el mismo booking: B espera el índice único y da 23505; queda uno; sin 40P01',
      a.ok && b.codigo === '23505' && n === 1 && sinInterbloqueo(a, b),
      { a, b, n },
    )
  }
  await limpiarTransporte(orquesta)
}
