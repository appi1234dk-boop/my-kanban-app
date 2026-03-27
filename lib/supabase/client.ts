import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type BrowserClient = ReturnType<typeof createBrowserClient>;
declare global {
  // eslint-disable-next-line no-var
  var _supabaseBrowserClient: BrowserClient | undefined;
}

export const supabase: BrowserClient = (() => {
  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!globalThis._supabaseBrowserClient) {
    globalThis._supabaseBrowserClient = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey
    );
  }
  return globalThis._supabaseBrowserClient;
})();
