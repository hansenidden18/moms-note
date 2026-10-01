import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import { native } from "./platform";
import { startWebUpdates } from "./updates";
if (!native) startWebUpdates();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
