import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
export async function ask(label, { secret = false } = {}) {
  if (!process.stdin.isTTY)
    throw new Error("Ejecuta este comando en una terminal interactiva.");
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    process.stdout.write(label);
    muted = secret;
    const value = await new Promise((resolve, reject) => {
      rl.once("SIGINT", () => reject(new Error("Operación cancelada.")));
      rl.question("").then(resolve, reject);
    });
    if (secret) process.stdout.write("\n");
    return value;
  } finally {
    rl.close();
    output.end();
  }
}
