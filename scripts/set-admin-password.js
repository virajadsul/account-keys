// Sets an admin's password: asks for it (hidden), stores only a bcrypt hash
// in MongoDB, and signs that admin out everywhere.
//   npm run admin:password -- --email you@example.com
// Non-interactive: echo "password" | npm run admin:password -- --email you@example.com
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import bcrypt from "bcryptjs";
import { withAdmins, isEmail, BCRYPT_ROUNDS } from "./admin-db.js";

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => s.startsWith(question) && rl.output.write(s); // echo nothing while typing
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

const { values } = parseArgs({ options: { email: { type: "string" } } });
const interactive = process.stdin.isTTY;
const email = (values.email || (interactive ? await ask("Admin email: ") : "")).trim().toLowerCase();
if (!isEmail(email)) {
  console.error("A valid --email is required.");
  process.exit(1);
}

let password;
if (interactive) {
  password = await ask("New password (12-72 characters): ", { hidden: true });
  if (password !== (await ask("Repeat password: ", { hidden: true }))) {
    console.error("Passwords don't match.");
    process.exit(1);
  }
} else {
  password = await readStdin();
}
// bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated.
if (password.length < 12 || Buffer.byteLength(password) > 72) {
  console.error("Password must be 12-72 characters.");
  process.exit(1);
}

await withAdmins(async (admins, db) => {
  const admin = await admins.findOne({ email });
  if (!admin) {
    console.error(`No admin with email ${email}. Create it first: npm run admin:seed -- --name "..." --email ${email}`);
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await admins.updateOne({ _id: admin._id }, { $set: { passwordHash, passwordChangedAt: new Date() } });
  // A new password ends every existing session of this admin.
  await db.collection("admin_sessions").deleteMany({ adminId: admin._id });
  console.log(`Password set for ${admin.name} <${email}> (stored as a bcrypt hash).`);
});
