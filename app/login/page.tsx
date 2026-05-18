import LoginClient from "./login-client";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return <LoginClient redirectTo={sanitizeRedirect(redirect)} />;
}

function sanitizeRedirect(redirect?: string) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard";
  }

  return redirect;
}
