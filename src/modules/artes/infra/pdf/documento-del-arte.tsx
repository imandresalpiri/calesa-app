import 'server-only'
// `Image` de react-pdf no es un `<img>` del DOM: no lleva `alt` (el PDF no tiene árbol de accesibilidad con él); el nombre propio evita confundirlo con el de next/image.
import {
  Defs,
  Document,
  Ellipse,
  Image as ImagenDelPdf,
  Line,
  LinearGradient,
  Page,
  Path,
  Polygon,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { Caja } from '../../entities/editor/cajas'
import type { PinturaDelPdf } from '../../entities/pdf/color-del-pdf'
import type {
  FondoDelPdf,
  PaginaDelPdf,
  PrimitivaDelPdf,
  TrazoDelPdf,
} from '../../entities/pdf/primitivas-del-pdf'
import type { Medidas } from '../../entities/formatos'
import { FAMILIA_DEL_ARTE } from './fuentes-del-arte'
import type { ImagenParaElPdf } from './imagen-para-el-pdf'

// El PDF de un arte: una hoja por página, del tamaño del formato, con lo que arma `geometriaDelPdf()` pintado tal cual (este archivo no decide
// nada). Cada capa va en su caja, que gira alrededor de su centro (el `transformOrigin` de react-pdf); lo vectorial, en un `<Svg>` del tamaño de
// su marco; el texto, una línea por `<Text>` en su lugar, con texto real (se selecciona y se busca). Las imágenes llegan ya preparadas, por
// primitiva (`imagen-para-el-pdf.ts`).
export type PropsDelDocumento = {
  paginas: readonly PaginaDelPdf[]
  imagenes: ReadonlyMap<PrimitivaDelPdf, ImagenParaElPdf>
  // El nombre de la plantilla y el de la empresa: el título y el autor del PDF.
  titulo: string
  autor: string
}

type DeTipo<T extends PrimitivaDelPdf['tipo']> = Extract<PrimitivaDelPdf, { tipo: T }>

const relleno = (pintura: PinturaDelPdf | null) =>
  pintura ? { fill: pintura.color, fillOpacity: pintura.opacidad } : { fill: 'none' }

const borde = (trazo: TrazoDelPdf | null) =>
  trazo ? { stroke: trazo.color, strokeOpacity: trazo.opacidad, strokeWidth: trazo.grosor } : {}

const enLugar = (caja: Caja) =>
  ({
    position: 'absolute',
    left: caja.x,
    top: caja.y,
    width: caja.ancho,
    height: caja.alto,
  }) as const

const vista = (caja: Caja) =>
  `${String(caja.x)} ${String(caja.y)} ${String(caja.ancho)} ${String(caja.alto)}`

// La caja de una capa, girada alrededor de su centro como en el lienzo.
function EnSuCaja({ primitiva, children }: { primitiva: PrimitivaDelPdf; children: ReactNode }) {
  const giro =
    primitiva.rotacion === 0 ? {} : { transform: `rotate(${String(primitiva.rotacion)}deg)` }
  return <View style={{ ...enLugar(primitiva.caja), ...giro }}>{children}</View>
}

// Un dibujo vectorial en el marco de su caja: las coordenadas de adentro siguen siendo las de la caja.
function EnSuMarco({ marco, children }: { marco: Caja; children: ReactNode }) {
  return (
    <Svg style={enLugar(marco)} viewBox={vista(marco)}>
      {children}
    </Svg>
  )
}

const puntosDe = (puntos: readonly number[]) =>
  puntos
    .reduce<string[]>((pares, valor, i) => {
      if (i % 2 === 1) {
        pares.push(`${String(puntos[i - 1])},${String(valor)}`)
      }
      return pares
    }, [])
    .join(' ')

function Vectorial({
  primitiva,
}: {
  primitiva: DeTipo<'rect' | 'elipse' | 'poligono' | 'linea' | 'trazo'>
}) {
  const { ancho, alto } = primitiva.caja
  switch (primitiva.tipo) {
    case 'rect': {
      const radio = primitiva.radio > 0 ? { rx: primitiva.radio, ry: primitiva.radio } : {}
      const pintura = { ...relleno(primitiva.relleno), ...borde(primitiva.borde) }
      return <Rect x={0} y={0} width={ancho} height={alto} {...radio} {...pintura} />
    }
    case 'elipse':
      return (
        <Ellipse
          cx={ancho / 2}
          cy={alto / 2}
          rx={ancho / 2}
          ry={alto / 2}
          {...relleno(primitiva.relleno)}
          {...borde(primitiva.borde)}
        />
      )
    case 'poligono':
      return (
        <Polygon
          points={puntosDe(primitiva.puntos)}
          strokeLinejoin="round"
          {...relleno(primitiva.relleno)}
          {...borde(primitiva.borde)}
        />
      )
    case 'linea':
      return (
        <Line
          x1={primitiva.desde.x}
          y1={primitiva.desde.y}
          x2={primitiva.hasta.x}
          y2={primitiva.hasta.y}
          strokeLinecap="round"
          {...borde(primitiva.borde)}
        />
      )
    case 'trazo':
      return (
        <Path
          d={primitiva.d}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...relleno(primitiva.relleno)}
          {...borde(primitiva.borde)}
        />
      )
  }
}

// Sin alto de línea: react-pdf pone la base a un ascenso del borde de arriba, que es lo que trae `arriba`. El ancho lleva una letra de más
// para que react-pdf no vuelva a partir la línea que ya se partió.
function Texto({ primitiva }: { primitiva: DeTipo<'texto'> }) {
  return primitiva.lineas.map((linea, i) => (
    <Text
      key={i}
      style={{
        position: 'absolute',
        left: linea.x,
        top: linea.arriba,
        width: linea.ancho + primitiva.tamano,
        fontFamily: FAMILIA_DEL_ARTE,
        fontWeight: primitiva.peso,
        fontSize: primitiva.tamano,
        color: primitiva.color.color,
        opacity: primitiva.color.opacidad,
      }}
    >
      {linea.texto}
    </Text>
  ))
}

function Imagen({ primitiva, imagen }: { primitiva: DeTipo<'imagen'>; imagen: ImagenParaElPdf }) {
  const { lugar, radio } = primitiva
  return (
    <>
      <View style={{ ...enLugar(lugar), borderRadius: radio, overflow: 'hidden' }}>
        <ImagenDelPdf
          src={imagen}
          style={{
            width: lugar.ancho,
            height: lugar.alto,
            objectFit: 'fill',
            opacity: primitiva.opacidad,
          }}
        />
      </View>
      {primitiva.borde ? (
        <EnSuMarco marco={primitiva.marco}>
          <Rect
            x={lugar.x}
            y={lugar.y}
            width={lugar.ancho}
            height={lugar.alto}
            {...(radio > 0 ? { rx: radio, ry: radio } : {})}
            fill="none"
            {...borde(primitiva.borde)}
          />
        </EnSuMarco>
      ) : null}
    </>
  )
}

function Primitiva({
  primitiva,
  imagenes,
}: {
  primitiva: PrimitivaDelPdf
  imagenes: PropsDelDocumento['imagenes']
}) {
  if (primitiva.tipo === 'texto') {
    return <Texto primitiva={primitiva} />
  }
  if (primitiva.tipo === 'imagen') {
    const imagen = imagenes.get(primitiva)
    return imagen ? <Imagen primitiva={primitiva} imagen={imagen} /> : null
  }
  return (
    <EnSuMarco marco={primitiva.marco}>
      <Vectorial primitiva={primitiva} />
    </EnSuMarco>
  )
}

function Fondo({ fondo, medidas, id }: { fondo: FondoDelPdf; medidas: Medidas; id: string }) {
  const hoja = { x: 0, y: 0, ...medidas }
  if (fondo.tipo === 'color') {
    return (
      <EnSuMarco marco={hoja}>
        <Rect x={0} y={0} width={medidas.ancho} height={medidas.alto} {...relleno(fondo.color)} />
      </EnSuMarco>
    )
  }
  return (
    <EnSuMarco marco={hoja}>
      <Defs>
        <LinearGradient
          id={id}
          x1={fondo.inicio.x}
          y1={fondo.inicio.y}
          x2={fondo.fin.x}
          y2={fondo.fin.y}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={fondo.desde.color} stopOpacity={fondo.desde.opacidad} />
          <Stop offset={1} stopColor={fondo.hasta.color} stopOpacity={fondo.hasta.opacidad} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={medidas.ancho} height={medidas.alto} fill={`url(#${id})`} />
    </EnSuMarco>
  )
}

// Todo va en una vista `fixed` del tamaño de la hoja: react-pdf no parte ni pasa a otra hoja lo que es `fixed` (una capa que cruza el borde de
// abajo, o que queda fuera, sigue en su página), y con `wrap={false}` la hoja tomaría el alto de lo que lleva, que es cero (todo es absoluto).
export function DocumentoDelArte({ paginas, imagenes, titulo, autor }: PropsDelDocumento) {
  return (
    <Document title={titulo} author={autor} creator={autor} producer={autor}>
      {paginas.map((pagina, i) => (
        <Page key={i} size={[pagina.medidas.ancho, pagina.medidas.alto]}>
          <View fixed style={enLugar({ x: 0, y: 0, ...pagina.medidas })}>
            <Fondo fondo={pagina.fondo} medidas={pagina.medidas} id={`fondo-${String(i)}`} />
            {pagina.primitivas.map((primitiva) => (
              <EnSuCaja key={primitiva.id} primitiva={primitiva}>
                <Primitiva primitiva={primitiva} imagenes={imagenes} />
              </EnSuCaja>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}
