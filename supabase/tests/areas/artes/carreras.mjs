// Las carreras de Artes (`artes_plantilla_guardar`, `artes_imagen_quitar`), con conexiones reales a la base del Supabase LOCAL. K1: dos personas
// guardan la misma plantilla de arte de la empresa con la misma versión; B espera la fila que tomó A y, cuando A confirma, recibe PT409 (nunca
// 40001). K2: A guarda una plantilla que nombra una imagen de la biblioteca mientras B la quita; B espera la FK de la tabla puente y, cuando A
// confirma, devuelve `{ usos: 1 }` sin borrarla. K3: al revés, A quita la imagen y B guarda la plantilla que la nombra; B espera y cae con 23503 (o
// 22023 `imagenes`): nunca queda una referencia a una imagen borrada. El terreno (un rol, las plantillas y las imágenes llevan el prefijo de las
// carreras; el rol lo borra también `limpiar()` de `scripts/carreras/terreno.mjs`) se borra al terminar, con lo que dejó en la cola de limpieza.
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { randomUUID } from 'node:crypto'
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena, compartido } = PERSONAS
const ROL = 'carreras_artes'
// Rutas por hash propias de las carreras: 62 «c» y el número.
const HASH = 'c'.repeat(62)
const ruta = (carpeta, n) => `${carpeta}/${HASH}${String(n).padStart(2, '0')}.png`

const documento = (...imagenes) =>
  JSON.stringify({
    version: 1,
    paginas: [
      { capas: imagenes.map((imagenId, i) => ({ id: `c${i}`, tipo: 'imagen', imagenId })) },
    ],
  })

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDe = async (db, tabla, id) =>
  (await db.query(`select actualizado_en::text as v from public.${tabla} where id = $1`, [id]))
    .rows[0].v

const guardar = (persona, id, version, doc) => ({
  persona,
  sql: `public.artes_plantilla_guardar($1, $2, $3, $4::jsonb, null)::text`,
  args: [id, version, `${PREFIJO} arte`, doc],
})

const quitar = (persona, id, version) => ({
  persona,
  sql: `public.artes_imagen_quitar($1, $2)::text`,
  args: [id, version],
})

async function nuevaPlantilla(db, { autor, origen, visibilidad }) {
  const id = randomUUID()
  await db.query(
    `insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento)
     values ($1, $2, 'cuadrado', 1080, 1080, $3, $4, $5, $6::jsonb)`,
    [id, `${PREFIJO} arte`, origen, visibilidad, autor, documento()],
  )
  return id
}

async function nuevaImagen(db, n) {
  const id = randomUUID()
  await db.query(
    `insert into public.artes_imagenes (id, nombre, ruta, miniatura_ruta, tipo, ancho, alto, ambito, creado_por)
     values ($1, $2, $3, $4, 'png', 100, 100, 'empresa', $5)`,
    [id, `${PREFIJO} imagen ${n}`, ruta('imagenes', n), ruta('miniaturas', n), duena],
  )
  return id
}

async function borrarLoNuestro(db) {
  // Las plantillas primero: la tabla puente cae con ellas y deja quitar las imágenes.
  await db.query(`delete from public.artes_plantillas where nombre like $1`, [`${PREFIJO}%`])
  await db.query(`delete from public.artes_imagenes where nombre like $1`, [`${PREFIJO}%`])
  await db.query(
    `delete from public.cola_gc_storage where bucket = 'artes' and ruta like any ($1::text[])`,
    [[`imagenes/${HASH}%`, `miniaturas/${HASH}%`]],
  )
  await db.query(
    `delete from public.usuarios_roles where rol_id in (select id from public.roles where clave = $1)`,
    [ROL],
  )
  await db.query(`delete from public.roles where clave = $1`, [ROL])
}

// Un rol que ve cotizaciones de todo origen y gestiona las artes de la empresa, para las dos personas, y el primer origen activo.
async function terrenoDeArtes(db) {
  await borrarLoNuestro(db)
  const {
    rows: [rol],
  } = await db.query(`insert into public.roles (clave, nombre) values ($1, $2) returning id`, [
    ROL,
    `${PREFIJO} artes`,
  ])
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     values ($1, 'cotizaciones.ver', 'todos'), ($1, 'artes.empresa.gestionar', 'todos')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $3, false), ($2, $3, false)`,
    [duena, compartido, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(
    `select id from public.origenes where activo order by creado_en, clave limit 1`,
  )
  return { origen: origen.id }
}

const referenciasDe = async (db, plantilla) =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.artes_plantillas_imagenes where plantilla_id = $1`,
        [plantilla],
      )
    ).rows[0].n,
  )

const existe = async (db, imagen) =>
  (await db.query(`select 1 from public.artes_imagenes where id = $1`, [imagen])).rowCount === 1

export async function carrerasDeArtes({ orquesta, carrera, espero }) {
  const { origen } = await terrenoDeArtes(orquesta)
  try {
    console.log('Dos personas guardan la misma plantilla de arte con la misma versión')
    {
      const id = await nuevaPlantilla(orquesta, { autor: duena, origen, visibilidad: 'empresa' })
      const version = await versionDe(orquesta, 'artes_plantillas', id)
      const r = await carrera(orquesta, {
        a: guardar(duena, id, version, documento()),
        b: guardar(compartido, id, version, documento()),
      })
      espero(
        'K1: A guarda la plantilla de arte; B esperó la fila y recibe PT409 con mensaje humano (nunca 40001)',
        r.a.ok && r.b.codigo === 'PT409',
        r.b,
      )
    }

    console.log('Alguien guarda una plantilla que nombra una imagen mientras otra persona la quita')
    {
      const imagen = await nuevaImagen(orquesta, 1)
      const plantilla = await nuevaPlantilla(orquesta, {
        autor: compartido,
        origen,
        visibilidad: 'privada',
      })
      const r = await carrera(orquesta, {
        a: guardar(
          compartido,
          plantilla,
          await versionDe(orquesta, 'artes_plantillas', plantilla),
          documento(imagen),
        ),
        b: quitar(duena, imagen, await versionDe(orquesta, 'artes_imagenes', imagen)),
      })
      const devuelto = r.b.ok ? JSON.parse(r.b.valor) : null
      espero(
        'K2: A guarda la plantilla que nombra la imagen; B, que la quita, esperó la FK y devuelve { usos: 1 }: la imagen queda',
        r.a.ok &&
          devuelto?.usos === 1 &&
          (await existe(orquesta, imagen)) &&
          (await referenciasDe(orquesta, plantilla)) === 1,
        r.b,
      )
    }

    console.log('Alguien quita una imagen mientras otra persona guarda una plantilla que la nombra')
    {
      const imagen = await nuevaImagen(orquesta, 2)
      const plantilla = await nuevaPlantilla(orquesta, {
        autor: compartido,
        origen,
        visibilidad: 'privada',
      })
      const r = await carrera(orquesta, {
        a: quitar(duena, imagen, await versionDe(orquesta, 'artes_imagenes', imagen)),
        b: guardar(
          compartido,
          plantilla,
          await versionDe(orquesta, 'artes_plantillas', plantilla),
          documento(imagen),
        ),
      })
      const quitada = r.a.ok && JSON.parse(r.a.valor)?.quitada === true
      const referencias = await referenciasDe(orquesta, plantilla)
      espero(
        'K3: A quita la imagen; B, que guarda una plantilla que la nombra, esperó y cae con 23503 o 22023 (imagenes): ninguna referencia a una imagen borrada',
        quitada &&
          !r.b.ok &&
          (r.b.codigo === '23503' || (r.b.codigo === '22023' && r.b.hint === 'imagenes')) &&
          referencias === 0 &&
          !(await existe(orquesta, imagen)),
        { a: r.a, b: r.b, referencias },
      )
    }
  } finally {
    await borrarLoNuestro(orquesta)
  }
}
