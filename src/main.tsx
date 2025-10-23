import { createRoot } from "react-dom/client";
import { AppProviders } from "./providers/AppProviders";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
