"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/services/auth";
import { updateMyProfile } from "@/services/users";
import toast from "react-hot-toast";

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

const inputClassName =
  "w-full rounded-[14px] border border-[#d6dee2] bg-white px-4 py-[14px] text-[1.06rem] text-[#1f3b4d] transition-[border-color,box-shadow] focus:border-[#2b9f9b] focus:shadow-[0_0_0_3px_rgba(43,159,155,0.18)] focus:outline-none disabled:border-dashed disabled:bg-[#f5f8f9] disabled:text-[#49596c]";

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      toast.error("Ingresa un correo válido.");
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
      toast.success("Perfil actualizado correctamente.");
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el perfil.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Si la sesión ya expiró, igual limpiamos el estado local.
    } finally {
      logout();
      toast.success("Sesión cerrada correctamente");
      router.push("/login");
    }
  };

  if (loading) {
    return <p className="p-10 text-center font-semibold text-gray-500">Cargando perfil...</p>;
  }
  if (!user) {
    return <p className="p-10 text-center font-semibold text-gray-500">No autenticado</p>;
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f3f6f6] px-4 py-9">
      <div className="mx-auto grid max-w-[1080px] overflow-hidden rounded-[28px] border border-[#dae5e5] bg-white shadow-[0_20px_44px_rgba(16,50,49,0.12)] min-[981px]:grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-[14px] bg-[#1f6a67] px-[34px] py-11 text-white max-[980px]:px-[22px] max-[980px]:py-[30px]">
          <div className="grid size-[120px] place-items-center rounded-full bg-white/14 text-[2.6rem] font-extrabold">
            {initials}
          </div>
          <h2 className="mt-1 text-[2rem] leading-[1.15]">{form.nombre || "Usuario"}</h2>
          <p className="m-0 opacity-95">{form.correo || "Sin correo"}</p>
          <div className="mt-auto flex flex-col gap-1 rounded-[14px] border border-white/12 bg-[rgba(12,48,46,0.55)] p-4 text-[0.8rem] uppercase tracking-[0.05em]">
            <span>Estado</span>
            <strong className="text-[1.15rem] normal-case tracking-normal">Cuenta activa</strong>
          </div>
        </aside>

        <section className="px-5 pt-7 pb-8 min-[981px]:px-[46px] min-[981px]:pt-10 min-[981px]:pb-8">
          <div className="mb-[18px] flex flex-col gap-4 border-b border-[#d4dbdc] pb-[18px] min-[981px]:flex-row min-[981px]:items-start min-[981px]:justify-between">
            <div>
              <h3 className="m-0 text-[2rem] text-[#0f3231]">Información personal</h3>
              <p className="mt-2 text-[1.02rem] text-[#607173]">
                Mantén tus datos actualizados para agilizar tus compras.
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                className="rounded-xl bg-[#2f9e9a] px-5 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                onClick={startEdit}
              >
                Editar
              </button>
            ) : null}
          </div>

          <form onSubmit={saveProfile} className="grid gap-3">
            <label htmlFor="nombre" className="text-[0.86rem] font-bold uppercase tracking-[0.03em] text-[#7c8a93]">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="Nombre completo"
              required
              className={inputClassName}
            />

            <label htmlFor="correo" className="text-[0.86rem] font-bold uppercase tracking-[0.03em] text-[#7c8a93]">
              Correo electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="correo@ejemplo.com"
              required
              className={inputClassName}
            />

            <label htmlFor="telefono" className="text-[0.86rem] font-bold uppercase tracking-[0.03em] text-[#7c8a93]">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="No registrado"
              className={inputClassName}
            />

            <label htmlFor="direccion" className="text-[0.86rem] font-bold uppercase tracking-[0.03em] text-[#7c8a93]">
              Dirección
            </label>
            <textarea
              id="direccion"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="No registrada"
              rows={3}
              className={`${inputClassName} min-h-[90px] resize-y`}
            />

            {isEditing ? (
              <div className="mt-[14px] flex flex-col gap-3 min-[981px]:flex-row min-[981px]:justify-end max-[980px]:[&>button]:flex-1">
                <button
                  type="button"
                  className="rounded-xl bg-[#e9eff0] px-5 py-3 text-base font-bold text-[#274045]"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2f9e9a] px-5 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            ) : null}
          </form>

          <div className="mt-[22px] flex justify-center min-[981px]:justify-end">
            <button
              type="button"
              onClick={handleLogout}
              className="border-0 bg-transparent p-0 text-base font-bold text-[#d51717] hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
