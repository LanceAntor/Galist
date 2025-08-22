import React from "react";
import "./ModeSelect.css";

function ModeSelect({ onSelect }) {
  return (
    <div className="mode-overlay" role="dialog" aria-modal="true">
      <video
        className="mode-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="./video/space.mp4" type="video/mp4" />
      </video>

      <div className="mode-content">
        <h2 className="mode-title">Choose Mode</h2>
        <p className="mode-subtitle">Select your linked list challenge</p>
        <div className="mode-options">
          <button
            className="mode-card"
            onClick={() => onSelect("singly")}
            aria-label="Singly Linked List"
          >
            <div className="mode-card-title">Singly Linked List</div>
            <div className="mode-card-desc">
              One-way pointers. Classic fundamentals.
            </div>
          </button>
          <button
            className="mode-card"
            onClick={() => onSelect("doubly")}
            aria-label="Doubly Linked List"
          >
            <div className="mode-card-title">Doubly Linked List</div>
            <div className="mode-card-desc">
              Prev and next pointers. Extra control.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModeSelect;
