const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type UpdateProfilePayload = {
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  password?: string;
};

export async function updateMyProfile(
  data: UpdateProfilePayload,
  token: string
) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "No se pudo actualizar el perfil");
  }

  return result;
}
