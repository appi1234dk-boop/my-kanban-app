const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient를 동적으로 import해서 SSR 번들에서 location 참조 방지
function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBrowserClient } = require("@supabase/ssr");
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

type BrowserClient = ReturnType<typeof createClient>;
declare global {
  // eslint-disable-next-line no-var
  var _supabaseBrowserClient: BrowserClient | undefined;
}

export const supabase: BrowserClient = (() => {
  if (typeof window === "undefined") {
    // 서버 사이드에서는 실제 클라이언트 불필요 (호출은 브라우저에서만 발생)
    return {} as BrowserClient;
  }
  if (!globalThis._supabaseBrowserClient) {
    globalThis._supabaseBrowserClient = createClient();
  }
  return globalThis._supabaseBrowserClient;
})();
