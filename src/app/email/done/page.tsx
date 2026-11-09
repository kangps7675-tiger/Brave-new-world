import type { Metadata } from "next";
import { EmailDoneCopy } from "./EmailDoneCopy";

export const metadata: Metadata = {
  title: "Email · Strait Desk",
  robots: { index: false, follow: false },
};

export default function EmailDonePage({
  searchParams,
}: {
  searchParams: { result?: string };
}) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-6 text-amber-50">
      <p className="text-xs tracking-wide text-amber-200/60">Strait Desk</p>
      <EmailDoneCopy result={searchParams.result} />
    </main>
  );
}
