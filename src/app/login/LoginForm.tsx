"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

// =============================================================================
// 로그인 폼 — 아이디 · 비밀번호 · 로그인 상태 유지
// 서버 응답 메시지를 그대로 노출하되, 실패 사유는 서버가 이미 일반화해서 보낸다.
// =============================================================================

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const idRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    idRef.current?.focus();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, password, remember, next }),
      });
      const data: { ok?: boolean; next?: string; message?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        setError(data.message ?? "로그인에 실패했습니다. 잠시 후 다시 시도하세요.");
        setPassword("");
        setPending(false);
        return;
      }

      // 세션 쿠키가 실린 상태로 서버 컴포넌트를 다시 그린다
      router.replace(data.next || next || "/");
      router.refresh();
    } catch {
      setError("네트워크 오류로 로그인하지 못했습니다. 연결을 확인하세요.");
      setPending(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-md border border-stone-300 bg-white px-3.5 text-[14px] text-stone-900 " +
    "placeholder:text-stone-400 outline-none transition-[border-color,box-shadow] duration-150 " +
    "focus:border-[#0095A9] focus:ring-2 focus:ring-[#0095A9]/20 disabled:bg-stone-50";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="fade-in flex items-start gap-2 rounded-md border border-[#e7c9bf] bg-[#fef2f0] px-3 py-2.5"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0 text-[#9a3412]" strokeWidth={1.75} />
          <p className="text-[12.5px] leading-relaxed text-[#7c2d12]">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="login-id" className="mb-1.5 block text-[12.5px] font-medium text-stone-700">
          아이디
        </label>
        <input
          id="login-id"
          ref={idRef}
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          value={id}
          onChange={(e) => setId(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          placeholder="발급받은 아이디"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-[12.5px] font-medium text-stone-700">
          비밀번호
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
            onBlur={() => setCapsLock(false)}
            aria-invalid={error ? true : undefined}
            aria-describedby={capsLock ? "caps-hint" : undefined}
            className={`${inputClass} pr-11`}
            placeholder="비밀번호"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-stone-400 transition-colors hover:text-stone-600"
          >
            {showPassword ? (
              <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
            )}
          </button>
        </div>
        {capsLock && (
          <p id="caps-hint" className="mt-1.5 text-[11.5px] text-[#b45309]">
            Caps Lock이 켜져 있습니다.
          </p>
        )}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 pt-0.5 text-[12.5px] text-stone-600 select-none">
        <input
          type="checkbox"
          checked={remember}
          disabled={pending}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-[15px] w-[15px] cursor-pointer accent-[#0095A9]"
        />
        로그인 상태 유지 <span className="text-stone-400">(14일)</span>
      </label>

      <button
        type="submit"
        disabled={pending || !id || !password}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0095A9] text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#007a8c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095A9] disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            확인 중
          </>
        ) : (
          <>
            <LockKeyhole className="h-4 w-4" strokeWidth={1.75} />
            로그인
          </>
        )}
      </button>
    </form>
  );
}
