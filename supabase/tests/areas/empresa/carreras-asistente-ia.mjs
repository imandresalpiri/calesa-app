// Las carreras del asistente de IA, con conexiones reales a la base del Supabase LOCAL. K1: la misma persona suma dos usos a la vez
// (`asistente_ia_contar_uso()`); B espera la fila que insertó A y, cuando A confirma, suma la suya: quedan 2, nunca 1 ni 40001. K2: dos
// personas guardan el asistente con la misma versión (`integracion_guardar('asistente_ia', …)`); B espera y recibe PT409 (nunca 40001).
// El terreno guarda la fila del asistente al empezar y la deja igual al terminar; el rol lleva el prefijo de las carreras (lo borra también
// `limpiar()` de `scripts/carreras/terreno.mjs`). Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena, compartido } = PERSONAS
const ROL = 'carreras_asistente_ia'

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDelAsistente = async (db) =>
  (
    await db.query(
      `select actualizado_en::text as v from public.integraciones where clave = 'asistente_ia'`,
    )
  ).rows[0].v

const usosDe = async (db, persona) =>
  (
    await db.query(
      `select coalesce(sum(usos), 0)::int as n from public.asistente_ia_usos where usuario_id = $1`,
      [persona],
    )
  ).rows[0].n

const contarUso = (persona) => ({ persona, sql: 'public.asistente_ia_contar_uso()', args: [] })

const guardarModelo = (persona, version, modelo) => ({
  persona,
  sql: `public.integracion_guardar('asistente_ia', $1, p_config => $2::jsonb)::text`,
  args: [
    version,
    JSON.stringify({ preajuste: 'otro', url_base: 'https://api.deepseek.com', modelo }),
  ],
})

async function borrarLoNuestro(db) {
  await db.query(`delete from public.asistente_ia_usos where usuario_id = any ($1::uuid[])`, [
    [duena, compartido],
  ])
  await db.query(
    `delete from public.usuarios_roles where rol_id in (select id from public.roles where clave = $1)`,
    [ROL],
  )
  await db.query(`delete from public.roles where clave = $1`, [ROL])
}

// Un rol que gestiona los ajustes de la empresa para las dos personas, y la fila del asistente como estaba.
async function terrenoDelAsistente(db) {
  await borrarLoNuestro(db)
  const {
    rows: [antes],
  } = await db.query(
    `select activa, config, secreto_guardado_en from public.integraciones where clave = 'asistente_ia'`,
  )
  const {
    rows: [rol],
  } = await db.query(`insert into public.roles (clave, nombre) values ($1, $2) returning id`, [
    ROL,
    `${PREFIJO} asistente de IA`,
  ])
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'empresa.ajustes.gestionar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $3, false), ($2, $3, false)`,
    [duena, compartido, rol.id],
  )
  return { antes }
}

async function restaurar(db, { antes }) {
  await borrarLoNuestro(db)
  await db.query(
    `update public.integraciones set activa = $1, config = $2::jsonb, secreto_guardado_en = $3 where clave = 'asistente_ia'`,
    [antes.activa, JSON.stringify(antes.config), antes.secreto_guardado_en],
  )
}

export async function carrerasDelAsistente({ orquesta, carrera, espero }) {
  const terreno = await terrenoDelAsistente(orquesta)
  try {
    console.log('La misma persona suma dos usos del asistente a la vez')
    {
      const r = await carrera(orquesta, { a: contarUso(duena), b: contarUso(duena) })
      const usos = await usosDe(orquesta, duena)
      espero(
        'K1: A suma el primero; B esperó la fila de A y suma el segundo: quedan 2, nunca 1 ni 40001',
        r.a.ok && r.b.ok && usos === 2,
        { b: r.b, usos },
      )
    }

    console.log('Dos personas guardan el asistente con la misma versión')
    {
      const version = await versionDelAsistente(orquesta)
      const r = await carrera(orquesta, {
        a: guardarModelo(duena, version, 'deepseek-reasoner'),
        b: guardarModelo(compartido, version, 'deepseek-chat'),
      })
      const {
        rows: [fila],
      } = await orquesta.query(
        `select config ->> 'modelo' as modelo from public.integraciones where clave = 'asistente_ia'`,
      )
      espero(
        'K2: A guarda su modelo; B esperó y recibe PT409 con mensaje humano (nunca 40001)',
        r.a.ok && r.b.codigo === 'PT409' && fila.modelo === 'deepseek-reasoner',
        { b: r.b, modelo: fila.modelo },
      )
    }
  } finally {
    await restaurar(orquesta, terreno)
  }
}
