import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // cookies!
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

api.interceptors.request.use((config) => {
  if (typeof document === "undefined") {
    return config;
  }

  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  const xsrfToken = match?.[1];

  if (xsrfToken) {
    config.headers = config.headers ?? {};
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
  }

  return config;
});

export { api };
