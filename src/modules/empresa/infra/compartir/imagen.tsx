import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import {
  caracteresDeLaLeyenda,
  momentoParaCompartir,
  normalizarLeyenda,
  valorParaCompartir,
  type ParaCompartir,
  type TipoParaCompartir,
} from '../../entities/compartir-tipos-cambio'
import type { DibujanteDeImagen } from '../../entities/repositorios'
import { PESO_MAXIMO_LOGO } from '../../entities/marca'

// La imagen de los tipos de cambio para un cliente (`ImageResponse` de `next/og`, en el servidor: no suma JS a ninguna pantalla). 1080 px de ancho,
// la altura sale de cuántos tipos y de lo larga que es la leyenda. Geist (la fuente de la app, OFL 1.1: `fuentes/OFL.txt`); `next.config.ts` la lleva al
// desplegar (`outputFileTracingIncludes`).
const CARPETA = path.join(process.cwd(), 'src/modules/empresa/infra/compartir/fuentes')
const ANCHO = 1080
const MARGEN = 72
const FRANJA = 14
const ALTO_DE_LA_CABECERA = 120
const ALTO_DEL_MOMENTO = 64
const ALTO_DE_UNA_FILA = 112
const ALTO_DE_UNA_LINEA_DE_LEYENDA = 44
// Cuántos caracteres de la leyenda caben en una línea a 30 px dentro del ancho útil (con holgura: una línea de más sobra, una de menos corta).
const CARACTERES_POR_LINEA_DE_LEYENDA = 44

const COLOR_NEUTRO = '#1f2937'
const TINTA = '#111827'
const TINTA_SUAVE = '#6b7280'
const LINEA = '#e5e7eb'
const TIPOS_DE_LOGO = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'])

let fuentes: Promise<[Buffer, Buffer]> | null = null
function leerFuentes() {
  fuentes ??= Promise.all([
    readFile(path.join(CARPETA, 'Geist-Regular.ttf')),
    readFile(path.join(CARPETA, 'Geist-SemiBold.ttf')),
  ])
  return fuentes
}

// El logo como `data:` (satori no baja imágenes por su cuenta con timeout): sólo los formatos que dibuja y hasta el tope del logo. Un logo que no se
// puede traer no tumba la imagen: sale sólo el nombre.
async function logoComoDatos(url: string | null): Promise<string | null> {
  if (url === null) {
    return null
  }
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(4000) })
    const tipo = respuesta.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!respuesta.ok || !TIPOS_DE_LOGO.has(tipo)) {
      return null
    }
    // Si la respuesta declara un peso mayor al tope, ni se lee el cuerpo.
    if (Number(respuesta.headers.get('content-length') ?? 0) > PESO_MAXIMO_LOGO) {
      return null
    }
    const bytes = Buffer.from(await respuesta.arrayBuffer())
    return bytes.byteLength > PESO_MAXIMO_LOGO
      ? null
      : `data:${tipo};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

// `#rrggbb` o el neutro: el color sale de la base y entra a un estilo.
function colorDeLaFranja(color: string | null): string {
  return color !== null && /^#[0-9a-f]{6}$/i.test(color) ? color : COLOR_NEUTRO
}

function recortar(texto: string, largo: number): string {
  const letras = Array.from(texto)
  return letras.length <= largo ? texto : `${letras.slice(0, largo - 1).join('')}…`
}

export function altoDeLaImagen(tipos: number, leyenda: string | null): number {
  const lineas =
    leyenda === null
      ? 0
      : Math.ceil(caracteresDeLaLeyenda(leyenda) / CARACTERES_POR_LINEA_DE_LEYENDA)
  return (
    FRANJA +
    MARGEN +
    ALTO_DE_LA_CABECERA +
    ALTO_DEL_MOMENTO +
    tipos * ALTO_DE_UNA_FILA +
    (leyenda === null ? 0 : 48 + lineas * ALTO_DE_UNA_LINEA_DE_LEYENDA) +
    MARGEN
  )
}

function Cabecera({ empresa, logo }: { empresa: string; logo: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: ALTO_DE_LA_CABECERA }}>
      {logo === null ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse dibuja con satori: no hay next/image.
        <img
          src={logo}
          alt=""
          width={240}
          height={96}
          style={{ objectFit: 'contain', marginRight: 32 }}
        />
      )}
      {/* Hasta dos líneas: un nombre largo achica la letra en vez de cortarse a media palabra. */}
      <div
        style={{
          display: 'flex',
          flexShrink: 1,
          minWidth: 0,
          fontSize: Array.from(empresa).length <= 18 ? 52 : 40,
          fontWeight: 600,
          letterSpacing: -1,
          lineHeight: 1.15,
        }}
      >
        {recortar(empresa, logo === null ? 40 : 44)}
      </div>
    </div>
  )
}

function FilaDeTipo({
  tipo,
  locale,
  sinMoneda,
}: {
  tipo: TipoParaCompartir
  locale: string
  sinMoneda: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: ALTO_DE_UNA_FILA,
        borderTop: `2px solid ${LINEA}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 600 }}>
        {recortar(tipo.nombre, 18)}
      </div>
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 600 }}>
        {valorParaCompartir(tipo, locale, { sinMoneda })}
      </div>
    </div>
  )
}

function Imagen({ datos, logo }: { datos: ParaCompartir; logo: string | null }) {
  const leyenda = normalizarLeyenda(datos.leyenda)
  return (
    <div
      style={{
        width: ANCHO,
        height: altoDeLaImagen(datos.tipos.length, leyenda),
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        color: TINTA,
        fontFamily: 'Geist',
      }}
    >
      <div
        style={{ height: FRANJA, background: colorDeLaFranja(datos.colorAcento), display: 'flex' }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: `${MARGEN}px ${MARGEN}px`,
          flexGrow: 1,
        }}
      >
        <Cabecera empresa={datos.empresa} logo={logo} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: ALTO_DEL_MOMENTO,
            fontSize: 30,
            color: TINTA_SUAVE,
          }}
        >
          {`Tipos de cambio · ${momentoParaCompartir(datos.ahora, datos.zonaHoraria)}`}
        </div>
        {datos.tipos.map((tipo) => (
          <FilaDeTipo
            key={tipo.id}
            tipo={tipo}
            locale={datos.locale}
            sinMoneda={datos.sinMoneda === true}
          />
        ))}
        {leyenda === null ? null : (
          <div
            style={{
              display: 'flex',
              marginTop: 48,
              fontSize: 30,
              lineHeight: `${ALTO_DE_UNA_LINEA_DE_LEYENDA}px`,
              color: TINTA_SUAVE,
            }}
          >
            {leyenda}
          </div>
        )}
      </div>
    </div>
  )
}

export const dibujarImagenDeTiposCambio: DibujanteDeImagen = async (datos) => {
  try {
    const [regular, seminegrita] = await leerFuentes()
    const logo = await logoComoDatos(datos.logoUrl)
    const imagen = new ImageResponse(<Imagen datos={datos} logo={logo} />, {
      width: ANCHO,
      height: altoDeLaImagen(datos.tipos.length, normalizarLeyenda(datos.leyenda)),
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: seminegrita, weight: 600, style: 'normal' },
      ],
    })
    return ok(new Uint8Array(await imagen.arrayBuffer()))
  } catch (error) {
    console.error('No se pudo dibujar la imagen de los tipos de cambio', error)
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
}
