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

Las listas permiten búsqueda y filtros en el servidor. Sin parámetros de paginación mantienen el arreglo original para compatibilidad. Con `pagina` o `limite` devuelven `{datos,total,pagina,limite,paginas}`; `pagina` inicia en 1, `limite` es 10 por defecto y admite hasta 100.

```text
GET /api/productos?pagina=1&limite=10&q=martillo&categoria=1&estado=activo
GET /api/productos?pagina=1&stock=bajo&estado=activo
GET /api/ventas?pagina=1&estado=confirmada&desde=2026-11-01&hasta=2026-11-30
GET /api/movimientos_inventario?tipo_movimiento=entrada&q=HER-001
```

`q` busca códigos, nombres y datos de contacto relacionados; los caracteres `%` y `_` se buscan literalmente. Las fechas son inclusivas según el valor almacenado en MySQL. Se rechazan fechas imposibles, intervalos invertidos, estados inválidos y límites fuera de rango. Las listas incluyen campos como `categoria_nombre`, `cliente_nombre`, `proveedor_nombre`, `empleado_nombre` y `producto_nombre` según el recurso.

## Reportes, reposición, comprobantes y CSV

| Método | Ruta                                        | Resultado                                                       |
| ------ | ------------------------------------------- | --------------------------------------------------------------- |
| GET    | /reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD | Resumen y productos más vendidos; solo operaciones confirmadas  |
| GET    | /inventario-bajo                            | Productos activos con stock menor o igual al mínimo             |
| GET    | /ventas/:id/comprobante                     | Venta coherente, cliente, empleado y líneas con nombres/códigos |
| GET    | /recurso/exportar.csv                       | CSV de cualquiera de los diez recursos                          |
| GET    | /reportes/exportar.csv                      | Resumen y productos del reporte                                 |
| GET    | /inventario-bajo/exportar.csv               | Lista de reposición                                             |

Los CSV también admiten la terminación `/exportar`. El inventario bajo tiene el alias `/inventario/bajo`. Los filtros de la tabla se conservan al exportar; `pagina` y `limite` no recortan el CSV. Se incluye BOM UTF-8, comillas escapadas y protección de cadenas que Excel podría interpretar como fórmulas.

El reporte devuelve `desde`, `hasta`, `resumen`, `mas_vendidos` y `criterio_ganancia`. El resumen contiene `ventas`, `cantidad_ventas`, `compras`, `cantidad_compras`, `costo_estimado` y `ganancia_estimada`. Sin fechas, cubre los últimos treinta días hasta hoy en Costa Rica. La ganancia estima ingresos menos unidades vendidas por `precio_compra` actual: no usa costos históricos ni representa utilidad contable.

La reposición propone `objetivo=stock_minimo+1`, `faltante=objetivo-stock` y `costo_reposicion=faltante*precio_compra`. Acepta búsqueda `q` y `categoria`. No crea compras automáticamente.

El comprobante conserva el estado de la venta, incluso si es borrador o cancelada, y se identifica como documento interno, sin validez de factura electrónica. La interfaz utiliza la impresión del navegador para guardar PDF, sin servicios externos.

## Colecciones Postman

`postman/NovaObra.postman_collection.json` permite explorar los endpoints manualmente. `postman/NovaObra.verificacion.postman_collection.json` ejecuta un recorrido automatizado con comprobaciones explícitas y crea sus propias relaciones. Usar esta última sobre una base de desarrollo desechable: sus operaciones comerciales conservan historial. `postman/NovaObra.mejoras.postman_collection.json` valida las nuevas funciones. El comando con Newman está documentado en `docs/pruebas.md`.
