// El PDF de un arte contra su lienzo (`artes-pdf-contra-el-lienzo.spec.ts`): una página aparte del navegador, en un origen inventado que
// sirve `pdfjs-dist` desde `node_modules` (sin la CSP de la app), dibuja la página 1 de un PDF al tamaño de un PNG y cuenta los píxeles que
// difieren. La página importa pdfjs como módulo (un `import()` dentro de `page.evaluate` lo transpila Playwright) y lo corre en su hilo
// (`globalThis.pdfjsWorker`): un worker pediría su archivo por fuera de la ruta.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page } from './prueba'

const ORIGEN = 'http://pdfjs.prueba'
const ARCHIVOS = ['pdf.min.mjs', 'pdf.worker.min.mjs']
const PAGINA = `<!doctype html><title>PDF contra lienzo</title><body style="margin:0;display:flex;gap:8px">
<script type="module">
  import * as pdfjs from '/pdf.min.mjs'
  import * as trabajador from '/pdf.worker.min.mjs'
  globalThis.pdfjsWorker = trabajador
  globalThis.pdfjsLib = pdfjs
</script>`

export async function abrirElRasterizador(page: Page): Promise<void> {
  const carpeta = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build')
  await page.route(`${ORIGEN}/**`, async (ruta) => {
    const archivo = new URL(ruta.request().url()).pathname.slice(1)
    if (!ARCHIVOS.includes(archivo)) {
      await ruta.fulfill({
        contentType: 'text/html',
        body: PAGINA,
      })
      return
    }
    await ruta.fulfill({
      contentType: 'text/javascript',
      body: await readFile(path.join(carpeta, archivo)),
    })
  })
  await page.goto(`${ORIGEN}/`)
  await page.waitForFunction(() => 'pdfjsLib' in globalThis)
}

// La fracción de píxeles (de 0 a 1) que difieren en algún canal más que `canal`, con las dos imágenes reducidas a la mitad: el PNG del lienzo y
// la página 1 del PDF dibujada a su ancho. Deja las dos a la vista, lado a lado (para una captura).
export async function diferenciaConElLienzo(
  page: Page,
  { png, pdf, canal }: { png: Buffer; pdf: Buffer; canal: number },
): Promise<number> {
  return page.evaluate(
    async ({ png, pdf, canal }) => {
      type Pagina = {
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (o: { canvas: HTMLCanvasElement; viewport: unknown }) => { promise: Promise<void> }
      }
      type Pdfjs = {
        getDocument: (o: { data: Uint8Array }) => {
          promise: Promise<{ getPage: (n: number) => Promise<Pagina> }>
        }
      }
      const { pdfjsLib: pdfjs } = globalThis as unknown as { pdfjsLib: Pdfjs }
      const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const imagen = await createImageBitmap(new Blob([bytes(png)], { type: 'image/png' }))
      const documento = await pdfjs.getDocument({ data: bytes(pdf) }).promise
      const pagina = await documento.getPage(1)
      const escala = imagen.width / pagina.getViewport({ scale: 1 }).width
      const delPdf = document.createElement('canvas')
      delPdf.width = imagen.width
      delPdf.height = imagen.height
      await pagina.render({ canvas: delPdf, viewport: pagina.getViewport({ scale: escala }) })
        .promise
      const aLaMitad = (fuente: CanvasImageSource) => {
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.round(imagen.width / 2)
        lienzo.height = Math.round(imagen.height / 2)
        const contexto = lienzo.getContext('2d')
        if (!contexto) throw new Error('sin contexto 2d')
        contexto.imageSmoothingQuality = 'high'
        contexto.drawImage(fuente, 0, 0, lienzo.width, lienzo.height)
        document.body.append(lienzo)
        return contexto.getImageData(0, 0, lienzo.width, lienzo.height).data
      }
      document.body.replaceChildren()
      const a = aLaMitad(imagen)
      const b = aLaMitad(delPdf)
      let distintos = 0
      for (let i = 0; i < a.length; i += 4) {
        const difiere = [0, 1, 2, 3].some(
          (c) => Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0)) > canal,
        )
        if (difiere) distintos += 1
      }
      return distintos / (a.length / 4)
    },
    { png: png.toString('base64'), pdf: pdf.toString('base64'), canal },
  )
}

// El ascenso y el descenso de la Geist del PDF que mide el navegador (`fontBoundingBox*`), en fracciones del tamaño, ya cargada.
export async function metricasEnElNavegador(
  page: Page,
  familia: string,
): Promise<{ ascenso: number; descenso: number; cargada: boolean }> {
  return page.evaluate(async (familia) => {
    await document.fonts.load(`600 100px "${familia}"`)
    const contexto = document.createElement('canvas').getContext('2d')
    if (!contexto) throw new Error('sin contexto 2d')
    contexto.font = `600 1000px "${familia}"`
    const medida = contexto.measureText('Hg')
    return {
      ascenso: medida.fontBoundingBoxAscent / 1000,
      descenso: medida.fontBoundingBoxDescent / 1000,
      cargada: document.fonts.check(`600 100px "${familia}"`),
    }
  }, familia)
}
