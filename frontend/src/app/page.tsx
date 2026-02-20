import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Bienvenido a Teatro Aventura Lite</h1>
          <p className={styles.heroDescription}>
            Plataforma interactiva para dirigir obras de teatro ramificadas donde el público
            vota cómo continúa la historia en tiempo real.
          </p>
        </div>
      </main>
    </div>
  );
}
