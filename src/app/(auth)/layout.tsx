import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-ink">리드플로우</h1>
            <p className="text-[16px] text-ink-2">DB부터 만남까지, 성과로</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
