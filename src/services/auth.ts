const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function registerUser(data: {
  nombre: string;
  correo: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Error al registrar");
  }

  return result;
}

export async function loginUser(data: {
  correo: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Error al iniciar sesión");
  }

  return result;
}
