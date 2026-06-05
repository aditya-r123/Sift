import { createRoot } from "react-dom/client";

import DesignApp from "./design-app.js";

import "./sift-design-system.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root for design entry");
}

createRoot(rootEl).render(<DesignApp />);
