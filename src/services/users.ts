const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type UpdateProfilePayload = {
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  password?: string;
};

export async function getMyProfile() {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "GET",
    credentials: "include",
  });

  const result = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "No se pudo obtener la sesion actual";

    throw new Error(message);
  }

  return result as {
    user: {
      id: number;
      nombre: string;
      correo: string;
      telefono: string | null;
      direccion: string | null;
      rol: string;
      activo: boolean;
      emailVerified: boolean;
      emailVerifiedAt: string | null;
    };
  };
}

export async function updateMyProfile(data: UpdateProfilePayload) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "No se pudo actualizar el perfil");
  }

  return result;
}
