import { setAuthToken, uploadFileV2 } from "../api";

function mockResponse(payload: unknown, status = 200) {
  const textPayload = typeof payload === "string" ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => textPayload,
    headers: {
      get: () => null,
    },
  } as unknown as Response;
}

describe("v2 files upload api", () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAuthToken("access-token");
  });

  afterEach(() => {
    setAuthToken(null);
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
  });

  it("uploads with multipart form and maps nested response fields", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        data: {
          file_id: "file_1",
          file_url: "https://cdn.example.com/files/1.jpg",
          file_name: "1.jpg",
          mime_type: "image/jpeg",
          size: 2048,
        },
      })
    );

    const result = await uploadFileV2({
      uri: "file:///tmp/1.jpg",
      name: "1.jpg",
      mimeType: "image/jpeg",
    });

    expect(result).toMatchObject({
      id: "file_1",
      url: "https://cdn.example.com/files/1.jpg",
      name: "1.jpg",
      mimeType: "image/jpeg",
      size: 2048,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v2/files/upload");
    expect(init.method).toBe("POST");
    const headers = (init.headers || {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-token");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("falls back to top-level response keys", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        url: "https://cdn.example.com/files/top-level.jpg",
      })
    );

    const result = await uploadFileV2({
      uri: "file:///tmp/2.jpg",
      name: "2.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.url).toBe("https://cdn.example.com/files/top-level.jpg");
    expect(result.name).toBe("2.jpg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only one upload request when api returns file is required", async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        {
          error: {
            message: "file is required",
          },
          message: "file is required",
        },
        400
      )
    );

    await expect(
      uploadFileV2({
        uri: "file:///tmp/3.jpg",
        name: "3.jpg",
        mimeType: "image/jpeg",
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "file is required",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
