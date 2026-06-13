import { prisma } from '../db.js';
import { authConfig } from '../auth/config.js';

// Deletes un-converted guest accounts older than GUEST_TTL_DAYS. Their groups,
// habits, entries, sessions and tokens are removed automatically via the
// onDelete: Cascade relations, so a single deleteMany is enough.
//
// Run on a schedule from infrastructure cron, e.g.:
//   0 3 * * *  cd /app/server && npm run purge-guests
export async function purgeGuests(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - authConfig.guestTtlMs);
  const { count } = await prisma.user.deleteMany({
    where: { isGuest: true, createdAt: { lt: cutoff } },
  });
  return count;
}

// Only run when invoked directly (not when imported by a test).
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  purgeGuests()
    .then((count) => {
      console.log(`Purged ${count} expired guest account(s).`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
