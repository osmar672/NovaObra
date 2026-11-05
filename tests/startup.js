import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fixture, available } from "./helpers.js";

async function reserve(port = 0) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
const close = server => new Promise(resolve => server.close(resolve));
test("Inicio coordinado: disponibilidad real, cierre y fallo de MySQL", { skip: !available, timeout: 30000 }, async () => {
  const f = await fixture();
  const reserved = await reserve();
  const port = reserved.address().port;
  await close(reserved);
  const env = { ...process.env, DB_HOST: f.config.db.host, DB_PORT: String(f.config.db.port), DB_USER: f.config.db.user, DB_PASSWORD: f.config.db.password, DB_NAME: f.database, PORT: String(port), PUBLIC_URL: f.config.publicUrl, SESSION_SECRET: f.config.secret, NODE_ENV: "development" };
  let child;
  function run(extra = {}) {
    let output = "";
    child = spawn(process.execPath, ["iniciar.mjs"], { cwd: new URL("../", import.meta.url), env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { output += data; });
    const done = new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
    return { done, output: () => output };
  }
  try {
    const live = run();
    for (let i = 0; i < 120 && !live.output().includes("NovaObra lista"); i++) {
      if (child.exitCode !== null) throw new Error(live.output());
      await delay(100);
    }
    assert.match(live.output(), /NovaObra lista/);
    assert.equal((await (await fetch(f.config.publicUrl + "/api/health")).json()).ok, true);
    child.kill("SIGINT");
    assert.equal(await live.done, 0);
    for (const p of [port, 5174]) await close(await reserve(p));
    const failed = run({ DB_PORT: "1" });
    assert.equal(await failed.done, 1);
    assert.doesNotMatch(failed.output(), /NovaObra lista|VITE v/);
    for (const p of [port, 5174]) await close(await reserve(p));
  } finally {
    if (child && child.exitCode === null) child.kill("SIGTERM");
    await f.close();
  }
});
