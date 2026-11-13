// Prints a bcrypt hash to paste into the `passwordHash` field in Compass.
// Never paste the plain password into the database — login won't work and it would be readable.
//   npm run admin:hash
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "./admin-db.js";

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const q = "Password to hash (12-72 characters): ";
rl._writeToOutput = (s) => s.startsWith(q) && rl.output.write(s);
rl.question(q, async (password) => {
  rl.close();
  process.stdout.write("\n");
  if (password.length < 12 || Buffer.byteLength(password) > 72) {
    console.error("Password must be 12-72 characters.");
    process.exit(1);
  }
  console.log(`\nPaste this into the admin's "passwordHash" field:\n\n${await bcrypt.hash(password, BCRYPT_ROUNDS)}\n`);
});
