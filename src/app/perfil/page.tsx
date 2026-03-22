"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/services/auth";
import { updateMyProfile } from "@/services/users";
import { ToastViewport, type ToastItem } from "@/components/feedback";
import toast from "react-hot-toast";
import styles from "./perfil.module.css";

type ProfileForm = {
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
};

function toForm(user: Record<string, unknown>): ProfileForm {
  return {
    nombre: String(user.nombre ?? ""),
    correo: String(user.correo ?? ""),
    telefono: String(user.telefono ?? ""),
    direccion: String(user.direccion ?? ""),
  };
}

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading, updateUser, logout } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    nombre: "",
    correo: "",
    telefono: "",
    direccion: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (type: ToastItem["type"], text: string) => {
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 10000),
        type,
        text,
      },
    ]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (!user) return;
    setForm(toForm(user as Record<string, unknown>));
  }, [user]);

  const initials = useMemo(() => {
    const fullName = form.nombre.trim();
    if (!fullName) return "U";
    const letters = fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "");
    return letters.join("");
  }, [form.nombre]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startEdit = () => {
    if (!user) return;
    setForm(toForm(user as Record<string, unknown>));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (!user) return;
    setForm(toForm(user as Record<string, unknown>));
    setIsEditing(false);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = form.nombre.trim();
    const correo = form.correo.trim();

    if (!nombre) {
      pushToast("error", "El nombre es obligatorio.");
      return;
    }

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      pushToast("error", "Ingresa un correo valido.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await updateMyProfile({
        nombre,
        correo,
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
      });

      updateUser(result.user);
      setForm(toForm(result.user as Record<string, unknown>));
      pushToast("success", "Perfil actualizado correctamente.");
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el perfil.";
      pushToast("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Si la sesion ya expiro, igual limpiamos el estado local.
    } finally {
      logout();
      toast.success("Sesión cerrada correctamente");
      router.push("/login");
    }
  };

  if (loading) return <p className={styles.noAuth}>Cargando perfil...</p>;
  if (!user) return <p className={styles.noAuth}>No autenticado</p>;

  return (
    <div className={styles.page}>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <div className={styles.card}>
        <aside className={styles.sidebar}>
          <div className={styles.avatar}>{initials}</div>
          <h2>{form.nombre || "Usuario"}</h2>
          <p>{form.correo || "Sin correo"}</p>
          <div className={styles.statusBox}>
            <span>Estado</span>
            <strong>Cuenta activa</strong>
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.header}>
            <div>
              <h3>Informacion personal</h3>
              <p>Manten tus datos actualizados para agilizar tus compras.</p>
            </div>

            {!isEditing ? (
              <button type="button" className={styles.primaryBtn} onClick={startEdit}>
                Editar
              </button>
            ) : null}
          </div>

          <form onSubmit={saveProfile} className={styles.form}>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="Nombre completo"
              required
            />

            <label htmlFor="correo">Correo electronico</label>
            <input
              id="correo"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="correo@ejemplo.com"
              required
            />

            <label htmlFor="telefono">Telefono</label>
            <input
              id="telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="No registrado"
            />

            <label htmlFor="direccion">Direccion</label>
            <textarea
              id="direccion"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="No registrada"
              rows={3}
            />

            {isEditing ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            ) : null}
          </form>

          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutBtn}
            >
              Cerrar sesion
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
