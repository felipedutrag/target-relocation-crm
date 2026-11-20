import { OAuthAuthorizeView } from "@/components/auth/oauth-authorize-view";

export const dynamic = "force-dynamic";

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (key: string) => {
    const val = sp[key];
    return Array.isArray(val) ? val[0] || "" : val || "";
  };

  return (
    <OAuthAuthorizeView
      params={{
        clientId: pick("client_id") || "openai-mcp",
        redirectUri: pick("redirect_uri"),
        state: pick("state"),
        codeChallenge: pick("code_challenge"),
        codeChallengeMethod: pick("code_challenge_method") || "S256",
        scope: pick("scope") || "mcp:read",
      }}
    />
  );
}
