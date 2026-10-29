// Shared HTTP pieces. Error bodies are fixed strings: they never echo input, exceptions or data.

export interface HttpRequestLike {
  headers: { get(name: string): string | null };
  query: URLSearchParams;
}

export interface HttpResult {
  status: number;
  jsonBody: unknown;
  headers?: Record<string, string>;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export const json = (status: number, jsonBody: unknown, headers: Record<string, string> = {}): HttpResult => ({
  status,
  jsonBody,
  headers: { ...NO_STORE, ...headers },
});

export const ERRORS = {
  unauthenticated: () => json(401, { error: 'unauthenticated', message: 'Sign in to see the HR Dashboard.' }),
  forbidden: () => json(403, { error: 'forbidden', message: "You don't have access to the HR Dashboard." }),
  badRequest: () => json(400, { error: 'badRequest', message: 'That filter option is not available.' }),
  unavailable: () => json(503, { error: 'unavailable', message: 'The dashboard data could not be read. Try again shortly.' }),
};
