import React from "react";
import styles from "./ModeSelect.module.css";

function ModeSelect({ onSelect }) {
  return (
    <div className={styles.modeOverlay} role="dialog" aria-modal="true">
      <video
        className={styles.modeVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="./video/space.mp4" type="video/mp4" />
      </video>

      <div className={styles.modeContent}>
        <h2 className={styles.modeTitle}>Choose Mode</h2>
        <p className={styles.modeSubtitle}>Select your linked list challenge</p>
        <div className={styles.modeOptions}>
          <button
            className={styles.modeCard}
            onClick={() => onSelect("singly")}
            aria-label="Singly Linked List"
          >
            <div className={styles.modeCardTitle}>Singly Linked List</div>
            <div className={styles.modeCardDesc}>
              One-way pointers. Classic fundamentals.
            </div>
          </button>
          <button
            className={styles.modeCard}
            onClick={() => onSelect("doubly")}
            aria-label="Doubly Linked List"
          >
            <div className={styles.modeCardTitle}>Doubly Linked List</div>
            <div className={styles.modeCardDesc}>
              Prev and next pointers. Extra control.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModeSelect;
