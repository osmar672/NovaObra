import test from "node:test";
import assert from "node:assert/strict";
import {
  statements,
  expectedSchema,
  dataStatements,
  encodeBackup,
  decodeBackup,
} from "../scripts/backup-common.js";

test("respaldo: conserva literales y rechaza SQL fuera de las diez tablas", async () => {
  const schema = await expectedSchema();
  const sql =
    "INSERT INTO `categorias` (`id_categoria`, `nombre`, `descripcion`, `estado`) VALUES (1,'Árbol \\'café\\'; -- literal','=SUM(1,2)\\n/* literal */','activo');";
  const inserts = dataStatements(sql, schema);
  assert.equal(inserts.length, 1);
  assert.deepEqual(
    decodeBackup(encodeBackup(schema, inserts), schema).inserts,
    inserts,
  );
  assert.equal(statements(sql).length, 1);
  for (const invalid of [
    sql + "DROP DATABASE otra;",
    "USE otra;" + sql,
    "INSERT INTO `clientes` (`id_cliente`,`nombre`) VALUES (1,(SELECT password FROM otra.secretos));",
    "INSERT INTO `otra`.`clientes` (`id_cliente`,`nombre`) VALUES (1,'x');",
    "INSERT INTO `clientes` (`id_cliente`,`nombre`) VALUES (1,'x') ON DUPLICATE KEY UPDATE nombre='otro';",
    "INSERT INTO `clientes` (`id_cliente`,`nombre`) VALUES (1,'x'); /*!50000 DROP DATABASE otra; */ USE otra;",
    "INSERT INTO `clientes` (`id_cliente`,`nombre`) VALUES (1,'x',);",
    "INSERT INTO `clientes` (`id_cliente`,`columna_inventada`) VALUES (1,'x');",
  ])
    assert.throws(() => dataStatements(invalid, schema));
  assert.throws(() =>
    decodeBackup(
      encodeBackup(schema, inserts).replace("Árbol", "Cambio"),
      schema,
    ),
  );
  assert.throws(() => decodeBackup("SELECT 1;", schema));
});
