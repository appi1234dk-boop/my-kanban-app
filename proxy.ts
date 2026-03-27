import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 인증 체크가 필요한 라우트만 확인
function needsAuthCheck(path: string): boolean {
  return (
    path.startsWith("/project/") ||
    path.startsWith("/profile") ||
    (path.startsWith("/auth/") &&
      !path.startsWith("/auth/callback") &&
      !path.startsWith("/auth/reset-password"))
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 인증 체크가 필요 없는 라우트는 즉시 통과
  if (!needsAuthCheck(path)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 보호된 라우트에서만 getUser() 호출 (token refresh 포함)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /project/[id] 및 /profile/* 는 로그인 필요
  if (
    (path.startsWith("/project/") || path.startsWith("/profile")) &&
    !user
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // 이미 로그인한 사용자가 /auth/* 접근 시 홈으로
  if (path.startsWith("/auth/") && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
