import { clearSession } from "@/lib/session";
import { handle } from "@/lib/api";

export async function POST() {
  return handle(async () => {
    await clearSession();
    return { loggedOut: true };
  });
}
