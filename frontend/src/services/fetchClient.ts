type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface FetchOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: HttpMethod;
  data?: Record<string, unknown>;
}

interface ApiResponse<T> {
  data: T;
  error?: never;
}

interface ApiError {
  data?: never;
  error: {
    message: string;
    statusCode: number;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

async function fetchClient<T = unknown>(
  endpoint: string,
  { method = 'GET', data, ...customConfig }: FetchOptions = {}
): Promise<ApiResult<T>> {
  const headers = {
    'Content-Type': 'application/json',
    ...customConfig.headers,
  };

  const config: RequestInit = {
    method,
    headers,
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(endpoint, config);

    const responseData = await response.json();

    if (!response.ok) {
      return {
        error: {
          message: responseData.message || 'An error occurred during the API request.',
          statusCode: response.status,
        },
      };
    }

    return { data: responseData as T };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500,
      },
    };
  }
}

export default fetchClient;
