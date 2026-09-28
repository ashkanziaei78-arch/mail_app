"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import type { Tutorial } from "@/lib/tutorials";
import { faNumber } from "@/lib/jalali";

export default function HelpClient({ tutorials }: { tutorials: Tutorial[] }) {
  const [active, setActive] = useState(tutorials[0]?.id ?? "");
  const current = tutorials.find((t) => t.id === active) ?? tutorials[0];

  if (!current) return null;

  return (
    <>
      <PageHeader
        title="آموزش تصویری"
        description="هر بخش یک ویدیوی کوتاه از خودِ همین سامانه دارد، با توضیح قدم‌به‌قدم زیرش. ویدیوها روی همین سرور پخش می‌شوند و به اینترنت بیرونی نیاز ندارند."
      />

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="فهرست درس‌ها">
          <ul className="space-y-2">
            {tutorials.map((tutorial, index) => (
              <li key={tutorial.id}>
                <button
                  className="choice-card w-full text-right"
                  data-selected={tutorial.id === current.id}
                  onClick={() => setActive(tutorial.id)}
                  aria-current={tutorial.id === current.id ? "true" : undefined}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
                        style={{ background: "var(--surface-2)" }}>
                    {faNumber(index + 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{tutorial.title}</span>
                    <span className="mt-0.5 block text-xs leading-6" style={{ color: "var(--muted)" }}>
                      {tutorial.summary}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="space-y-4">
          <div className="card overflow-hidden">
            {/* key باعث می‌شود با عوض شدن درس، ویدیو از اول بارگذاری شود */}
            <video
              key={current.id}
              className="block w-full bg-black"
              controls
              preload="none"
              playsInline
              poster={`/help/${current.id}.jpg`}
              aria-label={`ویدیوی آموزشی: ${current.title}`}
            >
              <source src={`/help/${current.id}.mp4`} type="video/mp4" />
              مرورگر شما پخش ویدیو را پشتیبانی نمی‌کند؛ مراحل متنی زیر همان آموزش را کامل توضیح می‌دهند.
            </video>
          </div>

          <section className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
              {current.title}
            </h2>
            <p className="mb-5 text-sm leading-7" style={{ color: "var(--muted)" }}>{current.summary}</p>

            <ol className="space-y-4">
              {current.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                        style={{ background: "var(--primary)", color: "var(--primary-text)" }}>
                    {faNumber(index + 1)}
                  </span>
                  <span>
                    <span className="block font-bold">{step.title}</span>
                    <span className="mt-1 block text-sm leading-7" style={{ color: "var(--muted)" }}>{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </div>
    </>
  );
}
