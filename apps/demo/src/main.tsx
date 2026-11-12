import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import DemoBanner from "./components/DemoBanner";
import { installDemoFetchPatch } from "./lib/api";
import { loadState } from "./lib/demoStore";
import "./index.css";

installDemoFetchPatch();
loadState();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DemoBanner />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
