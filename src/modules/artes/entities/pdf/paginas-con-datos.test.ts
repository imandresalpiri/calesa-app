import { describe, expect, it } from 'vitest'
import {
  capaDeFoto,
  capaDeTexto,
  catalogoDe,
  datosReales,
  paginaCon,
} from '../datos/datos-de-prueba.soporte'
import { valoresDelArte } from '../datos/valores-del-arte'
import { VERSION_DEL_DOCUMENTO, type DocumentoDeArte } from '../documento'
import { imagenesDelPdf, paginasConDatos } from './paginas-con-datos'

const catalogo = catalogoDe('subasta')
const datos = datosReales()

function conDatos(documento: DocumentoDeArte) {
  return paginasConDatos(documento, valoresDelArte(datos, { sinMoneda: false, catalogo }), {
    catalogo,
    logos: [],
    datos,
    sinMoneda: false,
  })
}

describe('las páginas de un arte para su PDF', () => {
  it('resuelve cada página y pide cada imagen una vez, aunque se repita en otra página', () => {
    const documento: DocumentoDeArte = {
      version: VERSION_DEL_DOCUMENTO,
      paginas: [
        paginaCon([capaDeTexto('t', '{marca}'), capaDeFoto('f', 0)]),
        { ...paginaCon([capaDeFoto('g', 0), capaDeFoto('h', 1)]), id: 'p2' },
      ],
    }
    const paginas = conDatos(documento)
    expect(paginas.map((p) => p.pagina.id)).toEqual(['p', 'p2'])
    expect(paginas[0]?.conDatos.resueltas.get('t')).toEqual({ tipo: 'texto', texto: 'Nissan' })
    const imagenes = imagenesDelPdf(paginas)
    expect(imagenes).toHaveLength(2)
    expect(new Set(imagenes).size).toBe(2)
  })
})
