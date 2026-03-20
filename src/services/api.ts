export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type RegisterUserPayload = {
  nombre: string;
  correo: string;
  password: string;
};

export async function registerUser(data: RegisterUserPayload) {
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
