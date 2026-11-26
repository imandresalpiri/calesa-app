// Las carreras de los catálogos de logística propios o compartidos: dos `puerto_crear` con el mismo nombre normalizado en el mismo origen (el candado de
// la tabla los pone en fila: uno crea y el otro recibe 23505 con el nombre del que ganó), dos `naviera_guardar` con la misma versión (el segundo espera
// la fila y recibe PT409; nada se pisa) y un compartido que se edita mientras el propio que lo tapa se desactiva (el guardar del compartido espera el
// candado de la tabla y mide el permiso con el propio ya desactivado). Las personas propias (correo `carreras-…`, rol `carreras_…`) y el origen (nombre
// `Carreras…`, con sus propios en cascada) los borra `limpiar()`; la naviera y el puerto compartidos se borran aquí al empezar y al terminar.
import { PREFIJO } from './terreno.mjs'

const GESTIONA = '00000000-0000-4000-8000-0000000c0201' // logistica.catalogos.gestionar en todos los orígenes
const OTRO = '00000000-0000-4000-8000-0000000c0202' // la misma clave en cada origen menos el de las carreras
const NAVIERA = `${PREFIJO} naviera compartida`
const PUERTO = `${PREFIJO} puerto tapado`

async function borrarCompartida(db) {
  await db.query(`delete from public.navieras where origen_id is null and nombre like $1`, [
    `${NAVIERA}%`,
  ])
  await db.query(`delete from public.puertos where nombre like $1`, [`${PUERTO}%`])
}

// Quien gestiona los catálogos en cada origen menos `origen`: un compartido que `origen` tapa no le pide la clave ahí.
async function personaSinElOrigen(db, origen) {
  await db.query(`delete from auth.users where id = $1`, [OTRO])
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'carreras-catalogos-otro@ejemplo.com', '{"invitado": true}')`,
    [OTRO],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [OTRO, `${PREFIJO} catálogos sin el origen`],
  )
  await db.query(`delete from public.roles where clave = 'carreras_catalogos_otro'`)
  await db.query(
    `with r as (insert into public.roles (clave, nombre) values ('carreras_catalogos_otro', $1) returning id),
          p as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
                select r.id, 'logistica.catalogos.gestionar', o.id, 'todos' from r, public.origenes o where o.id <> $3)
     insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select $2, r.id, true from r`,
    [`${PREFIJO} catálogos sin el origen`, OTRO, origen],
  )
}

// Un puerto compartido y el propio de `origen` que lo tapa (misma clave), con sus versiones.
async function puertoTapado(db, origen) {
  const insertar = async (origenId) =>
    (
      await db.query(
        `insert into public.puertos (origen_id, nombre, pais) values ($1, $2, 'Chile') returning id, actualizado_en::text as version`,
        [origenId, PUERTO],
      )
    ).rows[0]
  return { compartido: await insertar(null), propio: await insertar(origen) }
}

async function terreno(db) {
  await borrarCompartida(db)
  await db.query(`delete from auth.users where id = $1`, [GESTIONA])
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'carreras-catalogos@ejemplo.com', '{"invitado": true}')`,
    [GESTIONA],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [GESTIONA, `${PREFIJO} catálogos`],
  )
  await db.query(`delete from public.roles where clave = 'carreras_catalogos'`)
  await db.query(
    `with r as (insert into public.roles (clave, nombre) values ('carreras_catalogos', $1) returning id),
          p as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
                select r.id, 'logistica.catalogos.gestionar', null, 'todos' from r)
     insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select $2, r.id, true from r`,
    [`${PREFIJO} catálogos`, GESTIONA],
  )
  const {
    rows: [{ id: origen }],
  } = await db.query(
    `insert into public.origenes (clave, nombre) values ('carreras_catalogos', $1)
     on conflict (clave) do update set nombre = excluded.nombre returning id`,
    [`${PREFIJO} catálogos`],
  )
  const {
    rows: [naviera],
  } = await db.query(
    `insert into public.navieras (nombre) values ($1) returning id, actualizado_en::text as version`,
    [NAVIERA],
  )
  await personaSinElOrigen(db, origen)
  return { origen, naviera, puerto: await puertoTapado(db, origen) }
}

export async function carrerasDeCatalogosDeLogistica({ orquesta, carrera, espero }) {
  const t = await terreno(orquesta)

  console.log('Dos puertos con el mismo nombre normalizado en el mismo origen, a la vez')
  {
    const crear = (nombre) => ({
      persona: GESTIONA,
      sql: `public.puerto_crear(gen_random_uuid(), $1, jsonb_build_object('nombre', $2::text, 'pais', 'Chile'))`,
      args: [t.origen, nombre],
    })
    const r = await carrera(orquesta, {
      a: crear('Puerto Carrera'),
      b: crear('  PUERTO   carrera '),
    })
    const { rows } = await orquesta.query(
      `select nombre from public.puertos where origen_id = $1 and public._catalogo_clave(nombre) = 'puerto carrera'`,
      [t.origen],
    )
    espero(
      'el candado los pone en fila: uno crea y el otro recibe 23505 con el nombre del que ganó',
      r.a.ok &&
        r.b.codigo === '23505' &&
        r.b.hint === 'nombre' &&
        r.b.mensaje === `Ya hay un puerto «Puerto Carrera» en ${PREFIJO} catálogos.` &&
        rows.length === 1,
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Dos personas guardan la misma naviera con la misma versión')
  {
    const guardar = (nombre) => ({
      persona: GESTIONA,
      sql: `public.naviera_guardar($1, $2::timestamptz, jsonb_build_object('nombre', $3::text))`,
      args: [t.naviera.id, t.naviera.version, nombre],
    })
    const r = await carrera(orquesta, { a: guardar(`${NAVIERA} A`), b: guardar(`${NAVIERA} B`) })
    const { rows } = await orquesta.query(`select nombre from public.navieras where id = $1`, [
      t.naviera.id,
    ])
    espero(
      'la segunda espera la fila, ve la versión nueva y recibe PT409; queda la primera',
      r.a.ok && r.b.codigo === 'PT409' && rows[0]?.nombre === `${NAVIERA} A`,
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Se edita un compartido mientras se desactiva el propio que lo tapa')
  {
    const r = await carrera(orquesta, {
      a: {
        persona: GESTIONA,
        sql: `public.puerto_guardar($1, $2::timestamptz, '{"activo": false}'::jsonb)`,
        args: [t.puerto.propio.id, t.puerto.propio.version],
      },
      b: {
        persona: OTRO,
        sql: `public.puerto_guardar($1, $2::timestamptz, '{"codigo": "CRR"}'::jsonb)`,
        args: [t.puerto.compartido.id, t.puerto.compartido.version],
      },
    })
    const { rows } = await orquesta.query(`select codigo from public.puertos where id = $1`, [
      t.puerto.compartido.id,
    ])
    espero(
      'el compartido espera el candado, ve que su origen ya no lo tapa y recibe 42501; no cambia',
      r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje ===
          `No puedes cambiar «${PUERTO}»: lo usa ${PREFIJO} catálogos, donde no puedes configurar la logística.` &&
        rows[0]?.codigo === null,
      { a: r.a, b: r.b, rows },
    )
  }
  await borrarCompartida(orquesta)
}
