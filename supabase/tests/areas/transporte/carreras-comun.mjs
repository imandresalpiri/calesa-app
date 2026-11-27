// Terreno y arneses de las carreras del transporte (`carreras.mjs`, paso 6.07-1): el origen con sus tres fases, una unidad con su transporte, las
// versiones, la carrera de dos sesiones y la «trabada» de tres (X tiene una unidad tomada mientras A y B esperan).
import { PERSONAS, PREFIJO, comoPersona } from '../../../../scripts/carreras/terreno.mjs'

const { duena, supervision } = PERSONAS
const ROL = 'carreras_transporte'

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
export const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]
export const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')
const pidDe = async (db) => (await db.query('select pg_backend_pid() as pid')).rows[0].pid

// Lo que deja una corrida (también una rota). Va antes de `limpiar()` del terreno: el historial frena el borrado de las fases y los embarques y
// contenedores, el del origen (`restrict`); los transportes, el de los contenedores.
export async function limpiarTransporte(db) {
  const deLasCarreras = `(select id from public.vehiculos where titulo like $1)`
  const delOrigen = `(select id from public.origenes where nombre like $1)`
  const patron = [`${PREFIJO} transporte%`]
  await db.query(`delete from public.notas where vehiculo_id in ${deLasCarreras}`, patron)
  await db.query(`delete from public.historial_fases where vehiculo_id in ${deLasCarreras}`, patron)
  await db.query(`delete from public.transportes where vehiculo_id in ${deLasCarreras}`, patron)
  await db.query(`delete from public.contenedores where origen_id in ${delOrigen}`, patron)
  await db.query(`delete from public.embarques where origen_id in ${delOrigen}`, patron)
}

// Un origen con tres fases: «uno» (inicial), «pide» (exige el contenedor, bloqueante) y «tres»; transiciones uno → pide, uno → tres y tres → uno.
export async function terrenoTransporte(db) {
  const { id: rol } = await fila(
    db,
    `insert into public.roles (clave, nombre) values ($1, 'Carreras transporte') returning id`,
    [ROL],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select $1, k, 'todos' from unnest(array['logistica.ver', 'logistica.transporte.editar', 'flujos.mover']) k`,
    [rol],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $3), ($2, $3)`,
    [duena, supervision, rol],
  )
  const { id: origen } = await fila(
    db,
    `insert into public.origenes (clave, nombre) values ($1, $2) returning id`,
    [ROL, `${PREFIJO} transporte`],
  )
  const { id: flujo } = await fila(db, `select id from public.flujos where origen_id = $1`, [
    origen,
  ])
  const fase = async (nombre, orden, inicial) =>
    (
      await fila(
        db,
        `insert into public.fases (flujo_id, nombre, orden, es_inicial) values ($1, $2, $3, $4) returning id`,
        [flujo, `${PREFIJO} ${nombre}`, orden, inicial],
      )
    ).id
  const uno = await fase('uno', 10, true)
  const pide = await fase('pide', 20, false)
  const tres = await fase('tres', 30, false)
  await db.query(
    `insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values ($1, 'dato', 'transporte.contenedor', true)`,
    [pide],
  )
  await db.query(
    `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ($1, $2, $3), ($1, $2, $4), ($1, $4, $2)`,
    [flujo, uno, pide, tres],
  )
  return { origen, uno, pide, tres }
}

// Un vehículo en `fase` con su transporte (ids fijos si se piden, para ordenar a propósito), en el embarque `booking` y el contenedor
// `contenedor` del origen, que se crean si faltan (el contenedor, en ese embarque).
export async function unidad(
  db,
  t,
  { n, booking = null, contenedor = null, fase = t.uno, id = null, transporte = null },
) {
  const { id: v } = await fila(
    db,
    `insert into public.vehiculos (id, origen_id, titulo, fase_id, creado_por) values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5) returning id`,
    [id, t.origen, `${PREFIJO} transporte ${n}`, fase, duena],
  )
  let embarque = null
  if (booking) {
    await db.query(
      `insert into public.embarques (origen_id, booking) values ($1, $2) on conflict (booking, origen_id) do nothing`,
      [t.origen, booking],
    )
    embarque = (
      await fila(db, `select id from public.embarques where origen_id = $1 and booking = $2`, [
        t.origen,
        booking,
      ])
    ).id
  }
  let deContenedor = null
  if (contenedor) {
    await db.query(
      `insert into public.contenedores (origen_id, numero, embarque_id) values ($1, $2, $3) on conflict (numero, origen_id) do nothing`,
      [t.origen, contenedor, embarque],
    )
    deContenedor = (
      await fila(db, `select id from public.contenedores where origen_id = $1 and numero = $2`, [
        t.origen,
        contenedor,
      ])
    ).id
  }
  await db.query(
    `insert into public.transportes (id, vehiculo_id, contenedor_id, embarque_id) values (coalesce($1, gen_random_uuid()), $2, $3, $4)`,
    [transporte, v, deContenedor, deContenedor ? null : embarque],
  )
  return v
}

// El embarque del booking y la versión que pasa a `embarque_guardar`.
export const embarqueDe = async (db, booking) =>
  await fila(
    db,
    `select id, to_jsonb(actualizado_en) #>> '{}' as version from public.embarques where booking = $1 limit 1`,
    [booking],
  )
// Las versiones que pasa la ficha a `transporte_guardar`: la de la fila, la de su embarque y la de su contenedor.
export const versionDe = async (db, v) =>
  await fila(
    db,
    `select to_jsonb(x.actualizado_en) #>> '{}' as fila, to_jsonb(x.embarque_actualizado_en) #>> '{}' as embarque,
            to_jsonb(x.contenedor_actualizado_en) #>> '{}' as contenedor
       from public.transportes_con_embarque x where x.vehiculo_id = $1`,
    [v],
  )

// A abre su transacción y actúa; B lanza, se espera a que quede esperando un candado y A confirma.
export function armarCarrera({ orquesta, conectar, esperarBloqueo }) {
  return async function carrera({ a, b }) {
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await comoPersona(cb, supervision)
      await ca.query('begin')
      const primero = await comoValor(ca.query(`select ${a.sql} as r`, a.args))
      if (!primero.ok) throw new Error(`A falló antes de la carrera: ${primero.mensaje}`)
      const pidB = await pidDe(cb)
      const segundo = comoValor(cb.query(`select ${b.sql} as r`, b.args))
      await esperarBloqueo(orquesta, pidB)
      await ca.query('commit')
      return { a: primero, b: await segundo }
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}

// X (superusuario) toma `bloqueada` `for no key update`; lanza A y espera que se trabe, lanza B y espera que se trabe, y suelta X.
export function armarTrabada({ orquesta, conectar, esperarBloqueo }) {
  return async function trabada({ bloqueada, a, b }) {
    const [cx, ca, cb] = [await conectar(), await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await comoPersona(cb, supervision)
      await cx.query('begin')
      await cx.query('select 1 from public.vehiculos where id = $1 for no key update', [bloqueada])
      const pidA = await pidDe(ca)
      const pidB = await pidDe(cb)
      const deA = comoValor(ca.query(`select ${a.sql} as r`, a.args))
      await esperarBloqueo(orquesta, pidA)
      const deB = comoValor(cb.query(`select ${b.sql} as r`, b.args))
      await esperarBloqueo(orquesta, pidB)
      await cx.query('commit')
      return { a: await deA, b: await deB }
    } finally {
      await cx.end()
      await ca.end()
      await cb.end()
    }
  }
}
