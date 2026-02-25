import {
  authRequestPasswordResetCode,
  authResetPassword,
  authVerifyPasswordResetCode,
  setAuthToken,
} from "../api";

function mockResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: {
      get: () => null,
    },
  } as unknown as Response;
}

describe("password reset auth api", () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAuthToken("access-token-should-not-be-used");
  });

  afterEach(() => {
    setAuthToken(null);
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
  });

  it("requests reset code with public endpoint and no auth header", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ message: "ok", expiresAt: "2026-02-25T10:00:00Z" })
    );

    await authRequestPasswordResetCode({ email: "user@example.com" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/auth/forgot");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBe(JSON.stringify({ email: "user@example.com" }));
  });

  it("verifies reset code via verify endpoint", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        resetToken: "token_123",
        resetTokenExpiresAt: "2026-02-25T11:00:00Z",
      })
    );

    await authVerifyPasswordResetCode({ email: "user@example.com", code: "123456" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/auth/verify");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ email: "user@example.com", code: "123456" }));
  });

  it("resets password via reset endpoint", async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: true, message: "password reset successful" }));

    await authResetPassword({
      email: "user@example.com",
      resetToken: "token_123",
      password: "Password123!",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/auth/reset");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({
        email: "user@example.com",
        resetToken: "token_123",
        password: "Password123!",
      })
    );
  });
});
