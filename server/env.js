const REQUIRED_IN_PRODUCTION = ['AUTH_SECRET'];

export function validateRuntimeEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }

  const hasGoogleConfig = Boolean(
    process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_SECRET,
  );
  if (hasGoogleConfig) {
    const missingGoogle = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter(
      (name) => !process.env[name],
    );
    if (missingGoogle.length > 0) {
      throw new Error(
        `Incomplete Google OAuth configuration: missing ${missingGoogle.join(', ')}`,
      );
    }
  }

  const hasGitHubConfig = Boolean(
    process.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_SECRET,
  );
  if (hasGitHubConfig) {
    const missingGitHub = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'].filter(
      (name) => !process.env[name],
    );
    if (missingGitHub.length > 0) {
      throw new Error(
        `Incomplete GitHub OAuth configuration: missing ${missingGitHub.join(', ')}`,
      );
    }
  }
}
