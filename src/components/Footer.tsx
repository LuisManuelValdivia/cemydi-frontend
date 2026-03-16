"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <section className={styles.brand}>
          <Image
            src="/logo01.png"
            alt="CEMYDI"
            width={110}
            height={42}
            className={styles.logo}
          />
          <p>
            Ortopedia CEMYDI. Soluciones para movilidad, rehabilitacion y equipo
            medico.
          </p>
        </section>

        <section className={styles.column}>
          <h4>Enlaces</h4>
          <Link href="/catalogo">Catalogo</Link>
          <Link href="/login">Iniciar sesion</Link>
          <Link href="/register">Crear cuenta</Link>
        </section>

        <section className={styles.column}>
          <h4>Atencion</h4>
          <p>Lunes a Sabado</p>
          <p>9:00 am - 7:00 pm</p>
          <p>contacto@cemydi.com</p>
        </section>
      </div>

      <div className={styles.bottom}>
        <small>© {new Date().getFullYear()} CEMYDI. Todos los derechos reservados.</small>
      </div>
    </footer>
  );
}
