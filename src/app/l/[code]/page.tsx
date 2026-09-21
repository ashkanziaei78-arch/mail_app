import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifySigned } from "@/lib/crypto";
import { faDate } from "@/lib/jalali";
import AccessCodeForm from "./access-code-form";
import { verifyAccessCode } from "./actions";
import PrintButton from "./print-button";

export const metadata: Metadata = { title: "مشاهده نامه", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LetterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { code },
    include: {
      document: {
        include: {
          letter: { include: { letterhead: true, organization: { select: { name: true } } } },
          campaignRecipient: { include: { contact: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  if (!link) notFound();

  if (!link.isActive || (link.expiresAt && link.expiresAt < new Date())) {
    return (
      <Notice title="این لینک دیگر فعال نیست">
        مهلت مشاهده این نامه به پایان رسیده یا لینک توسط سازمان غیرفعال شده است. برای دریافت لینک جدید با سازمان فرستنده تماس بگیرید.
      </Notice>
    );
  }

  if (link.accessCode) {
    const token = (await cookies()).get(`ml_${code}`)?.value;
    const unlocked = token ? verifySigned(`${code}:${link.accessCode}`, token, "link-hmac") : false;
    if (!unlocked) return <AccessCodeForm code={code} verify={verifyAccessCode} />;
  }

  await prisma.shortLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const { document } = link;
  const letter = document.letter;
  const contact = document.campaignRecipient.contact;

  return (
    <main id="main" className="min-h-dvh p-4">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
           style={{ background: "var(--surface)" }}>
        <div>
          <p className="font-bold">{letter?.title ?? "نامه"}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            گیرنده: {contact.firstName} {contact.lastName} — شناسه سند: <span className="tnum">{document.documentNumber}</span>
          </p>
        </div>
        <PrintButton />
      </div>

      <article className="letter-sheet">
        {letter?.letterhead?.fileUrl && <img src={letter.letterhead.fileUrl} alt="" className="w-full" />}
        <div className="letter-body">
          {(letter?.letterNumber || letter?.letterDate) && (
            <p className="tnum mb-6 flex justify-between text-sm">
              {letter?.letterNumber && <span>شماره: {letter.letterNumber}</span>}
              {letter?.letterDate && <span>تاریخ: {faDate(letter.letterDate)}</span>}
            </p>
          )}
          {letter?.subject && <p className="mb-4 font-bold">موضوع: {letter.subject}</p>}
          <div dangerouslySetInnerHTML={{ __html: document.renderedHtml }} />
          {letter?.senderName && <p className="mt-10 text-left font-bold">{letter.senderName}</p>}
        </div>
      </article>

      <p className="no-print mx-auto mt-4 max-w-[210mm] text-center text-xs" style={{ color: "var(--muted)" }}>
        این نامه از سوی {letter?.organization.name ?? "سازمان فرستنده"} صادر شده است.
      </p>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md p-6 text-center">
        <h1 className="mb-2 text-lg font-bold">{title}</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{children}</p>
      </div>
    </main>
  );
}
