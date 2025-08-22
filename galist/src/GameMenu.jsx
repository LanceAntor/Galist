import React from "react";
import styles from "./GameMenu.module.css";

function GameMenu({ onStart }) {
  return (
    <div className={styles.gameMenuOverlay} role="dialog" aria-modal="true">
      {/* Background video */}
      <video
        className={styles.menuVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="./video/space.mp4" type="video/mp4" />
      </video>

      {/* Content */}
      <div className={styles.menuContent}>
        <h1 className={styles.menuTitle}>Galist</h1>
        <p className={styles.menuSubtitle}>Galaxy Linked List</p>

        <div className={styles.menuButtons}>
          <button
            className={`${styles.menuBtn} ${styles.primary}`}
            onClick={onStart}
          >
            Start Game
          </button>
          <button className={styles.menuBtn}>Tutorial</button>
          <button className={styles.menuBtn}>Leaderboards</button>
        </div>
      </div>
    </div>
  );
}

export default GameMenu;
