# API REST

Base: `http://127.0.0.1:3001/api`. JSON con Content-Type `application/json`. Respuestas: objeto para un registro, arreglo para listas, `{error: "mensaje"}` ante fallo. 200 lectura/cambio, 201 creación, 204 borrado, 400 validación, 404 inexistente, 409 conflicto, 500 fallo interno sin detalles sensibles.

## Recursos

Para cada uno de `categorias`, `proveedores`, `productos`, `clientes`, `empleados`, `compras`, `ventas`, `detalle_compras`, `detalle_ventas`, `movimientos_inventario`:

| Método | Ruta         | Uso                        |
| ------ | ------------ | -------------------------- |
| GET    | /recurso     | Listar                     |
| GET    | /recurso/:id | Consultar                  |
| POST   | /recurso     | Crear                      |
| PUT    | /recurso/:id | Sustituir campos editables |
| DELETE | /recurso/:id | Eliminar cuando sea válido |

En movimientos, PUT y DELETE de un registro existente responden 409: es un historial inmutable. En compras y ventas solo se editan/eliminan borradores. Los detalles se gestionan dentro del formulario de la operación o mediante sus endpoints individuales, siempre mientras la cabecera sea borrador. GET de una compra o venta devuelve cabecera y detalles de una sola consulta coherente, incluso durante ediciones concurrentes. Los IDs de cabecera de una línea no son editables. Un borrado inválido no es una funcionalidad faltante: protege el historial.

| Método | Ruta                   | Uso                                 |
| ------ | ---------------------- | ----------------------------------- |
| POST   | /compras/:id/confirmar | Aplicar entradas                    |
| POST   | /compras/:id/cancelar  | Revertir o cancelar borrador        |
| POST   | /ventas/:id/confirmar  | Aplicar salidas                     |
| POST   | /ventas/:id/cancelar   | Revertir o cancelar borrador        |
| GET    | /health                | Comprobar MySQL                     |
| GET    | /dashboard             | Indicadores y movimientos agrupados |
| GET    | /metadata              | Campos editables de catálogos       |

## Día 1: producto

POST `/productos`:

```json
{
  "id_categoria": 1,
  "codigo": "HER-002",
  "nombre": "Destornillador",
  "descripcion": "Plano",
  "precio_compra": 1000,
  "precio_venta": 1600,
  "stock_minimo": 5,
  "estado": "activo"
}
```

Después GET `/productos` o GET `/productos/:id`. PUT requiere todos los campos obligatorios editables; omitir contactos o descripción los deja en null. `stock` no se acepta en altas ni ediciones.

## Compra completa

POST `/compras`:

```json
{
  "id_proveedor": 1,
  "id_empleado": 1,
  "clave_solicitud": "compra-ejemplo-001",
  "detalles": [{ "id_producto": 1, "cantidad": 5, "costo_unitario": 2500 }]
}
```

POST `/compras/:id/confirmar` no requiere cuerpo. GET `/compras/:id` incluye detalles. Para venta, usar `id_cliente` y `precio_unitario`. PUT conserva la clave de solicitud original: no permite cambiarla. Al crear, repetir una clave devuelve 409, sin otro registro ni movimientos. Consultar `/compras` o `/ventas` para encontrar la operación con esa clave.

## Ajuste

POST `/movimientos_inventario`:

```json
{
  "id_producto": 1,
  "tipo_movimiento": "entrada",
  "cantidad": 2,
  "descripcion": "Conciliación física",
  "clave_solicitud": "ajuste-ejemplo-001"
}
```

Cantidades enteras positivas para líneas y movimientos, umbral entero no negativo. Importes como números JSON con hasta dos decimales, máximo 9999999999.99 por unidad; cantidad máxima 1000000. El almacenamiento DECIMAL limita el total comercial a 999999999999.99. No se permiten campos arbitrarios, fechas inválidas ni claves foráneas inexistentes.

Las listas cargan el conjunto completo y la búsqueda se realiza en el navegador; son adecuadas para el alcance académico. No incluyen paginación para volúmenes empresariales grandes.

## Colecciones Postman

`postman/NovaObra.postman_collection.json` permite explorar los endpoints manualmente. `postman/NovaObra.verificacion.postman_collection.json` ejecuta un recorrido automatizado con comprobaciones explícitas y crea sus propias relaciones. Usar esta última sobre una base de desarrollo desechable: sus operaciones comerciales conservan historial. El comando con Newman está documentado en `docs/pruebas.md`.
