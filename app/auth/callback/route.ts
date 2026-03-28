import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { upsertMemberForUser } from "@/lib/supabase/queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");
  const isSignup = searchParams.get("signup") === "true";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 비밀번호 재설정 콜백이면 reset-password 페이지로
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      // 회원가입 시에만 members 테이블에 등록
      if (isSignup) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const nickname = user.user_metadata?.nickname ?? user.email ?? "Unknown";
            const avatar_url = user.user_metadata?.avatar_url ?? null;
            await upsertMemberForUser(supabase, user.id, { nickname, avatar_url });
          }
        } catch {
          // members 등록 실패해도 로그인은 정상 진행
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
