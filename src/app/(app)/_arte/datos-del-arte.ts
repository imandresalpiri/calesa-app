// Los datos con que se llena un arte (docs/GLOSARIO.md › «Elemento con datos»), armados con lo que leen las rutas del vehículo de ejemplo
// (`src/app/(app)/artes/ejemplo/*`) y la página del editor: el vehículo, una de sus cotizaciones, quien comparte y la empresa, con las formas de
// `artes` (`DatosDelVehiculo`, `DatosDeLaCotizacion`, `FijosDelArte`). `artes` no importa `vehiculos`, `cotizaciones` ni `web`: las une `src/app`.
// Los montos van ya escritos, con su moneda y sin ella; las fechas, como ISO. Del asesor, sólo su WhatsApp: ningún otro teléfono. Puro.
import {
  fotosEnOrden,
  REDES_DEL_ARTE,
  type DatosDeLaCotizacion,
  type DatosDelVehiculo,
  type FijosDelArte,
  type MontoDelArte,
  type RedDelArte,
} from '@/modules/artes'
import {
  enlaceParaCompartir,
  type AsesorDeLaTarjeta,
  type DatosParaCompartir,
} from '@/modules/cotizaciones'
import type { CampoDeLayout } from '@/modules/origenes'
import { zonaDelPatioDe, type Galeria, type Vehiculo } from '@/modules/vehiculos'
import { valorMostrado } from '@/shared/lib/campos'
import { formatearNumero } from '@/shared/lib/formato'

type Formato = { locale: string; zona: string }

type CampoDeLaFicha = Pick<CampoDeLayout, 'clave' | 'tipo' | 'opciones' | 'activo'>

export type ParaElVehiculo = {
  vehiculo: Pick<
    Vehiculo,
    | 'id'
    | 'titulo'
    | 'marca'
    | 'modelo'
    | 'anio'
    | 'kilometraje'
    | 'vin'
    | 'lote'
    | 'urlOrigen'
    | 'atributos'
  >
  // El nombre del origen del vehículo.
  origen: string
  subasta: { subastaEn: string | null; subastaFinEn: string | null } | null
  // Los campos del layout del origen (también los desactivados: la ficha sólo nombra los activos).
  campos: readonly CampoDeLaFicha[]
  fotos: Pick<Galeria['fotos'][number], 'id' | 'ancho' | 'alto' | 'orden' | 'esPortada'>[]
  formato: Formato
}

// Las claves de los atributos que el arte nombra aparte de la ficha.
const ATRIBUTO_DEL_COLOR = 'color'
const ATRIBUTO_DE_LA_UBICACION = 'ubicacion'

// El instante como ISO de `Date` (la base puede mandarlo con microsegundos o con `+00:00`). Uno que no se lee es ninguno.
function isoONulo(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) return null
  const ms = Date.parse(texto)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

const DIA = /^\d{4}-\d{2}-\d{2}$/

const limpio = (texto: string | null | undefined): string | null => {
  const sinBordes = texto?.trim() ?? ''
  return sinBordes === '' ? null : sinBordes
}

// El valor de un campo como lo escribe un arte: el texto (una opción, por su etiqueta), la dirección de un enlace y un monto como número sin
// moneda (la ficha no sabe en qué moneda está: decisión «sin moneda en la ficha»). Vacío, nulo.
function escrito(campo: CampoDeLaFicha, valor: unknown, formato: Formato): string | null {
  const mostrado = valorMostrado(campo, valor, formato)
  switch (mostrado.tipo) {
    case 'texto':
      return limpio(mostrado.texto)
    case 'enlace':
      return limpio(mostrado.url)
    case 'monto':
      return formatearNumero(mostrado.valor, { locale: formato.locale })
    case 'vacio':
      return null
  }
}

// Un atributo fuera de la ficha (el color, la ubicación): con su campo del layout, como lo escribe; sin él, el texto tal cual.
function atributo(
  clave: string,
  { vehiculo, campos, formato }: Pick<ParaElVehiculo, 'vehiculo' | 'campos' | 'formato'>,
): string | null {
  const valor = vehiculo.atributos[clave]
  const campo = campos.find((c) => c.clave === clave)
  if (campo !== undefined) {
    return escrito(campo, valor, formato)
  }
  return typeof valor === 'string' ? limpio(valor) : null
}

// La ficha: cada campo activo del origen con valor, por su clave.
function fichaDe({ vehiculo, campos, formato }: ParaElVehiculo): Record<string, string> {
  const ficha = new Map<string, string>()
  for (const campo of campos) {
    if (!campo.activo || ficha.has(campo.clave)) {
      continue
    }
    const texto = escrito(campo, vehiculo.atributos[campo.clave], formato)
    if (texto !== null) {
      ficha.set(campo.clave, texto)
    }
  }
  return Object.fromEntries(ficha)
}

export function vehiculoParaElArte(para: ParaElVehiculo): DatosDelVehiculo {
  const { vehiculo, origen, subasta, fotos } = para
  return {
    id: vehiculo.id,
    titulo: vehiculo.titulo,
    marca: limpio(vehiculo.marca),
    modelo: limpio(vehiculo.modelo),
    anio: vehiculo.anio,
    color: atributo(ATRIBUTO_DEL_COLOR, para),
    kilometraje: vehiculo.kilometraje,
    vin: limpio(vehiculo.vin),
    lote: limpio(vehiculo.lote),
    ubicacion: atributo(ATRIBUTO_DE_LA_UBICACION, para),
    enlace: enlaceParaCompartir(vehiculo.urlOrigen),
    origen,
    cierre: isoONulo(subasta?.subastaFinEn ?? subasta?.subastaEn),
    zonaDelPatio: zonaDelPatioDe(vehiculo),
    ficha: fichaDe(para),
    fotos: fotosEnOrden(fotos).map(({ id, ancho, alto }) => ({ id, ancho, alto })),
  }
}

type Linea = DatosParaCompartir['conceptos'][number]

const montoDe = (linea: Linea): MontoDelArte => ({
  conMoneda: linea.monto,
  sinMoneda: linea.montoSinMoneda,
})

export type ParaLaCotizacion = {
  cotizacion: { id: string; numero: number }
  // El último día en que vale (`YYYY-MM-DD`, en la zona de la empresa).
  venceEl: string | null
  // Las cifras de la tarjeta de lo guardado (`paraCompartirDeUnaGuardada()`: sólo lo del nivel «todos»).
  cifras: Pick<DatosParaCompartir, 'conceptos' | 'total' | 'modo'>
}

// La imagen de la tarjeta por la ruta del mismo origen (`GET /cotizaciones/<id>/imagen`), con su moneda y sin ella.
const rutaDeLaTarjeta = (id: string) => `/cotizaciones/${encodeURIComponent(id)}/imagen`

export function cotizacionParaElArte({
  cotizacion,
  venceEl,
  cifras,
}: ParaLaCotizacion): DatosDeLaCotizacion {
  // Cada celda por su concepto; con dos del mismo concepto, la primera.
  const celdas = new Map<string, MontoDelArte>()
  for (const linea of cifras.conceptos) {
    const concepto = limpio(linea.concepto)
    if (concepto !== null && !celdas.has(concepto)) {
      celdas.set(concepto, montoDe(linea))
    }
  }
  const src = rutaDeLaTarjeta(cotizacion.id)
  return {
    id: cotizacion.id,
    numero: cotizacion.numero,
    total: cifras.total === null ? null : montoDe(cifras.total),
    modo: limpio(cifras.modo),
    venceEl: venceEl !== null && DIA.test(venceEl) ? venceEl : null,
    celdas: Object.fromEntries(celdas),
    imagen: { src, srcSinMoneda: `${src}?sin-moneda=1` },
  }
}

export type ParaLosFijos = {
  // Quien mira el editor (`asesorQueMira()`).
  asesor: Pick<AsesorDeLaTarjeta, 'nombre' | 'cargo' | 'telefono'> | null
  empresa: { nombre: string; locale: string; zona: string }
  // Sitio web › Ajustes: la dirección pública de la web y las redes; nulo si no se leyó.
  sitio: { direccionPublica: string | null; redes: Partial<Record<string, string>> } | null
}

// Sólo las redes que un arte nombra, con valor.
function redesDe(redes: Partial<Record<string, string>>): Partial<Record<RedDelArte, string>> {
  return Object.fromEntries(
    REDES_DEL_ARTE.flatMap((red) => {
      const valor = limpio(redes[red])
      return valor === null ? [] : [[red, valor]]
    }),
  )
}

export function fijosDelArte({ asesor, empresa, sitio }: ParaLosFijos): FijosDelArte {
  return {
    asesor:
      asesor === null
        ? null
        : { nombre: asesor.nombre, cargo: limpio(asesor.cargo), whatsapp: limpio(asesor.telefono) },
    empresa: {
      nombre: empresa.nombre,
      web: limpio(sitio?.direccionPublica),
      redes: sitio === null ? {} : redesDe(sitio.redes),
      zona: empresa.zona,
      locale: empresa.locale,
    },
  }
}
