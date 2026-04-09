const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthUser = {
  id: number;
  nombre: string;
  correo: string;
  activo: boolean;
  rol: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
};

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const result = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : fallbackMessage;

    throw new Error(message);
  }

  return result as T;
}

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
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseResponse<{ message: string; user: AuthUser }>(res, "Error al registrar");
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
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseResponse<{ user: AuthUser }>(res, "Error al iniciar sesión");
}

export async function resendVerificationEmail(correo: string) {
  const res = await fetch(`${API_URL}/auth/email-verification/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ correo }),
  });

  return parseResponse<{ message: string }>(res, "No se pudo reenviar el enlace");
}

export async function confirmEmailVerification(token: string) {
  const res = await fetch(
    `${API_URL}/auth/email-verification/confirm?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  return parseResponse<{ message: string }>(res, "No se pudo verificar el correo");
}

export async function requestPasswordReset(correo: string) {
  const res = await fetch(`${API_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ correo }),
  });

  return parseResponse<{ message: string }>(res, "No se pudo solicitar el código");
}

export async function verifyPasswordResetCode(data: {
  correo: string;
  codigo: string;
}) {
  const res = await fetch(`${API_URL}/auth/password-reset/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseResponse<{ message: string; expiresAt: string }>(
    res,
    "No se pudo verificar el código"
  );
}

export async function confirmPasswordReset(data: {
  correo: string;
  codigo: string;
  newPassword: string;
}) {
  const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseResponse<{ message: string }>(res, "No se pudo restablecer la contraseña");
}

export async function logoutUser() {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  return parseResponse<{ message: string }>(res, "No se pudo cerrar sesión");
}
