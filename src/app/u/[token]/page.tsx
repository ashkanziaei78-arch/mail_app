import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import UnsubscribeForm from "./unsubscribe-form";

export const metadata: Metadata = { title: "لغو دریافت پیامک", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * لغو دریافت پیامک با یک کلیک.
 * توکن یکتای هر مخاطب در انتهای پیامک می‌رود؛ نیازی به ورود نیست.
 */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contact = await prisma.contact.findUnique({
    where: { unsubscribeToken: token },
    include: { organization: { select: { name: true } } },
  });
  if (!contact || contact.deletedAt) notFound();

  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <UnsubscribeForm
        token={token}
        name={`${contact.firstName} ${contact.lastName}`}
        organizationName={contact.organization.name}
        alreadyUnsubscribed={!contact.smsConsent}
      />
    </main>
  );
}
