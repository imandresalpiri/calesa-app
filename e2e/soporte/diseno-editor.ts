// Lo que preparan y leen los e2e de la pestaña «Diseño» (4.22-2): una fórmula de tres sumandos (precio, flete y aduana suman el total) con un diseño de tres secciones,
// publicada por el camino de verdad (`_preparar_publicacion()`), y el borrador como quedó en la base. Los orígenes son los de `crearOrigenDeCotizar()`: los borra
// `borrarOrigenesDeCotizar()` con sus fórmulas.
import { literal, sql } from './sql'

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

const definicion = {
  buckets: { origen: 'tc' },
  nodos: [
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'Tipo de cambio', clave: 'oficial' },
    { id: 'precio', tipo: 'input', etiqueta: 'Precio', bucket: 'origen' },
    { id: 'flete', tipo: 'input', etiqueta: 'Flete', bucket: 'origen' },
    { id: 'aduana', tipo: 'input', etiqueta: 'Aduana', bucket: 'origen' },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['precio', 'flete', 'aduana'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
}

const celda = (nodo: string) => ({ tipo: 'celda', nodo, ancho: 'completo' })

const diseno = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 'base',
      titulo: 'Base',
      presentacion: 'principal',
      items: [celda('precio'), celda('flete')],
    },
    { id: 'extras', titulo: 'Extras', presentacion: 'principal', items: [celda('aduana')] },
    { id: 'resumen', titulo: 'Resumen', presentacion: 'principal', items: [celda('total')] },
  ],
  tarjeta_total: { nodo: 'total', secundarios: [] },
}

// Publica la versión 1 de un origen con la fórmula de tres sumandos y ese diseño (por omisión, el de tres secciones).
export function publicarFormulaDeTresSumandos(origenId: string, conDiseno: unknown = diseno): void {
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := '{}'::jsonb; v_dis jsonb := ${json(conDiseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.22', now());
    end $f$`)
}

// Una fórmula con dos tipos de cambio (el del bucket y el del total en Bs), una bandera que condiciona un monto y un nodo «aparte», con un diseño sin modos: lo que
// necesita el recorrido de la cabecera, los ítems y la tarjeta (4.22-3).
const definicionConModos = {
  buckets: { origen: 'tc_a' },
  total_en: 'tc_b',
  nodos: [
    { id: 'tc_a', tipo: 'tipo_cambio', etiqueta: 'TC oficial', clave: 'oficial' },
    { id: 'tc_b', tipo: 'tipo_cambio', etiqueta: 'TC paralelo', clave: 'paralelo' },
    { id: 'extra', tipo: 'bandera', etiqueta: 'Cobrar el extra' },
    { id: 'precio', tipo: 'input', etiqueta: 'Precio', bucket: 'origen' },
    { id: 'monto_extra', tipo: 'input', etiqueta: 'Extra', bucket: 'origen', condicion: 'extra' },
    { id: 'garantia', tipo: 'input', etiqueta: 'Garantía', bucket: 'origen', salida: 'aparte' },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['precio', 'monto_extra'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
}

const disenoConModos = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 'datos',
      titulo: 'Datos',
      presentacion: 'principal',
      items: [
        { tipo: 'interruptor', nodo: 'extra', efecto: 'habilita' },
        celda('tc_a'),
        celda('tc_b'),
        celda('precio'),
        celda('monto_extra'),
        celda('garantia'),
      ],
    },
    { id: 'resumen', titulo: 'Resumen', presentacion: 'principal', items: [celda('total')] },
  ],
  tarjeta_total: { nodo: 'total', secundarios: [] },
}

// Publica la versión 1 de un origen con la fórmula de dos tipos de cambio.
export function publicarFormulaConModos(origenId: string): void {
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicionConModos)}; v_par jsonb := '{}'::jsonb; v_dis jsonb := ${json(disenoConModos)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.22-3', now());
    end $f$`)
}

export type DisenoEnLaBase = {
  definicion: unknown
  params: unknown
  diseno: {
    cabecera?: {
      ver_total_bs: boolean
      modos: {
        clave: string
        nombre: string
        buckets: { bucket: string; nodo: string }[]
        total_en: string
      }[]
    }
    tarjeta_total?: { nodo: string; secundarios: string[] }
    avanzado?: { fila: number }
    secciones: {
      id: string
      presentacion: string
      posicion?: { columna: number; fila: number }
      alto?: number
      nivel_ver?: string
      nivel_editar?: string
      ancho?: number
      densidad?: string
      tono?: string
      items: {
        tipo?: string
        nodo: string
        posicion?: { columna: number; fila: number }
        ancho?: string | number
        alto?: number
        efecto?: string
        ayuda?: { texto?: string; tabla?: string } | Record<string, unknown>[]
        nivel_ver?: string
        nivel_editar?: string
      }[]
    }[]
  }
}

// El borrador del origen tal como quedó, o nulo.
export function leerElBorradorDelDiseno(origenId: string): DisenoEnLaBase | null {
  const fila = sql(`
    select coalesce(row_to_json(f)::text, '')
      from (select definicion, params, diseno from public.formulas
             where origen_id = ${literal(origenId)}::uuid and estado = 'borrador') f`)
  return fila === '' ? null : (JSON.parse(fila) as DisenoEnLaBase)
}

// ¿La definición y los params del borrador son, jsonb a jsonb, los de la publicada? (el orden de las claves no cuenta.)
export function definicionYParamsComoLaPublicada(origenId: string): boolean {
  return (
    sql(`
    select (b.definicion = p.definicion and b.params = p.params)::text
      from public.formulas b join public.formulas p on p.origen_id = b.origen_id
     where b.origen_id = ${literal(origenId)}::uuid and b.estado = 'borrador' and p.estado = 'publicada'`) ===
    'true'
  )
}

// Publica el borrador del origen como la versión siguiente por la validación entera de la base (`_preparar_publicacion()`: la forma, los tonos y los niveles del
// diseño), como `formula_publicar()` pero sin su sesión: la publicada pasa a archivada.
export function publicarElBorradorDelDiseno(origenId: string): void {
  sql(`
    do $f$
    declare b public.formulas; v_ver int;
    begin
      select * into b from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'borrador';
      if b.id is null then raise exception 'no hay borrador'; end if;
      select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = b.origen_id;
      update public.formulas set estado = 'archivada' where origen_id = b.origen_id and estado = 'publicada';
      update public.formulas set estado = 'publicada', version = v_ver, nota = 'E2E aspecto', publicado_en = now(),
             visibilidad = public._preparar_publicacion(b.definicion, b.params, b.diseno, false)
       where id = b.id;
    end $f$`)
}

// El diseño de tres sumandos con el aspecto que arma el recorrido de la rejilla: «Resumen» primero, «Base» a lo ancho, compacta y con un tono, y «Precio» en
// 8 de 12 columnas.
export function disenoConAspecto(tono: string) {
  const [base, extras, resumen] = diseno.secciones
  return {
    ...diseno,
    secciones: [
      resumen,
      {
        ...base,
        ancho: 12,
        densidad: 'compacta',
        tono,
        items: [{ ...celda('precio'), ancho: 8 }, celda('flete')],
      },
      extras,
    ],
  }
}

// Publica la versión siguiente del origen con ese diseño (la fórmula de tres sumandos, por `_preparar_publicacion()`).
export function publicarLaVersionConAspecto(origenId: string, tono: string): void {
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := '{}'::jsonb; v_dis jsonb := ${json(disenoConAspecto(tono))}; v_ver int;
    begin
      select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = ${literal(origenId)}::uuid;
      update public.formulas set estado = 'archivada' where origen_id = ${literal(origenId)}::uuid and estado = 'publicada';
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, v_ver, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E aspecto', now());
    end $f$`)
}

// El diseño de tres sumandos con la tarjeta del total como pieza (`{ tipo: 'total' }`) en «Resumen», junto a la celda del total: en la hoja de cotizar se ve una
// sola tarjeta grande por ancho (en la sección desde `@4xl/hoja`; por debajo, la del resumen al pie).
export function disenoConElTotal() {
  const [base, extras, resumen] = diseno.secciones
  return {
    ...diseno,
    secciones: [base, extras, { ...resumen, items: [celda('total'), { tipo: 'total' }] }],
  }
}

// Publica la versión 1 de un origen con la fórmula de tres sumandos y la tarjeta del total en «Resumen».
export function publicarFormulaConElTotal(origenId: string): void {
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := '{}'::jsonb; v_dis jsonb := ${json(disenoConElTotal())};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E total', now());
    end $f$`)
}

// Un tono propio del recorrido (los colores del amarillo de la semilla, que pasan el AA). Se borra después que las fórmulas que lo nombran.
export function crearTonoDePrueba(clave: string): void {
  sql(`
    insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
    values (${literal(clave)}, ${literal(`E2E ${clave}`)}, '#fff7d6', '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8')
    on conflict (clave) do nothing`)
}
export function borrarTonoDePrueba(clave: string): void {
  sql(`delete from public.tonos where clave = ${literal(clave)}`)
}
