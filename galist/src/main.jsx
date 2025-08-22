import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import GalistGame from "./GalistGame.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GalistGame />
  </StrictMode>
);
