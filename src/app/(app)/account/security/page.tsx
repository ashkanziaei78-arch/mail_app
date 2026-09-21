import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import SecurityClient from "./security-client";

export const metadata: Metadata = { title: "امنیت حساب" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requirePage();
  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { totpEnabled: true, totpBackupCodes: true, mobilePhone: true, passwordChangedAt: true },
  });

  return (
    <SecurityClient
      email={user.email}
      totpEnabled={record.totpEnabled}
      backupCodesLeft={record.totpBackupCodes.length}
      mobilePhone={record.mobilePhone}
      passwordChangedAt={record.passwordChangedAt.toISOString()}
    />
  );
}
