// Creates (or updates the name of) a superadmin. No password is set here —
// run `npm run admin:password` next.
//   npm run admin:seed -- --name "Viraj Adsul" --email dev.virajadsul@gmail.com
import { parseArgs } from "node:util";
import { withAdmins, isEmail } from "./admin-db.js";

const { values } = parseArgs({ options: { name: { type: "string" }, email: { type: "string" } } });
const name = values.name?.trim();
const email = values.email?.trim().toLowerCase();
if (!name || !email || !isEmail(email)) {
  console.error('Usage: npm run admin:seed -- --name "Full Name" --email you@example.com');
  process.exit(1);
}

await withAdmins(async (admins) => {
  const res = await admins.updateOne(
    { email },
    {
      $set: { name, updatedAt: new Date() },
      $setOnInsert: { email, role: "superadmin", isActive: true, passwordHash: null, createdAt: new Date() },
    },
    { upsert: true }
  );
  console.log(res.upsertedCount ? `Created superadmin ${name} <${email}>.` : `Updated superadmin ${name} <${email}>.`);
  const admin = await admins.findOne({ email });
  if (!admin.passwordHash) console.log(`No password yet. Set it with:  npm run admin:password -- --email ${email}`);
});
