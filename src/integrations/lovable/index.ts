import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      const supabaseProvider = provider === "lovable" ? "google" : provider;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: opts?.redirect_uri || `${window.location.origin}/auth/callback`,
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error, redirected: false };
      }

      return { error: null, redirected: true, data };
    },
  },
};
