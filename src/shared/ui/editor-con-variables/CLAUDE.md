# shared/ui/editor-con-variables

El editor de un texto configurable con variables entre llaves (docs/GLOSARIO.md › Editor de texto con variables, Variable de un texto). Sólo dibuja y avisa: no
guarda nada ni decide qué variables vale cada texto (eso lo dice quien lo usa, y la base lo repite).

## Entra y sale

- Sale (`index.ts`):
  - `<EditorConVariables id etiqueta valor alCambiar variables valores? motivo? largoMaximo deshabilitado? aceptaLaClave? compacto?>`: `'use client'`. Los botones
    de variable, la caja, el aviso en vivo, el contador «N de 1000» y, con `valores`, la vista previa. Controlado: el texto vive en quien lo usa. `aceptaLaClave`:
    una familia abierta de claves sin botón (`{ficha.<campo>}`, `{celda.<concepto>}` del texto base de las artes) que vale igual; `compacto`: botones chicos
    con sólo el nombre, para una columna angosta.
  - `<TextoConVariables texto claves valores? resaltar?>`: sin `'use client'`; un texto en segmentos con las variables como pastillas (el espejo, la vista previa y la
    tarjeta de Mensaje del portal lo usan).
  - `VariableDelEditor` (`{ clave, etiqueta, obligatoria? }`).
- Lo puro está en `@/shared/lib/texto-con-variables` (`PATRON_DE_VARIABLE`, `partesDelTexto()`, `revisarVariables()`, `insertarEnElCursor()`): la regex es la misma
  que la de la base (`\{([^{}]*)\}`) y la reusan las entities que espejan una validación.
- Lo usan el Mensaje del portal (`leads`) y el texto base del origen (`artes`, pestaña «Textos» del editor de artes). Un texto nuevo con variables entra por aquí, con su validación espejo de la base.

## No se rompe

- Es una `<textarea>` nativa con el texto transparente (`caret-color` visible) sobre un espejo `aria-hidden` que dibuja el mismo texto con pastillas. Se descartó
  `contenteditable` con fichas (rompe deshacer, el IME y el celular) y un editor enriquecido (cuesta JS).
- El espejo y la `<textarea>` comparten **una constante de clases** (`CAJA` en `caja-con-espejo.tsx`): letra, tamaño, interlineado, relleno, borde, ajuste y
  `scrollbar-gutter: stable`. La pastilla **no lleva padding ni borde** (sólo `box-shadow`), o corre el texto. Si algo de eso cambia, se mira al 200 % y en el celular.
- El botón de variable hace `preventDefault` en `pointerdown` (el celular no pierde la selección) y la selección se guarda en un `ref` (`onSelect`, `onBlur`). Insertar
  escribe `{clave}` en el cursor o sobre lo seleccionado y, con el valor nuevo ya en la caja, devuelve el foco con el cursor detrás (`useLayoutEffect`).
- El motivo que manda quien lo usa va en lugar del aviso en vivo (una sola línea de error junto al campo).
- El texto cuenta caracteres como la base (code points), no unidades UTF-16.
