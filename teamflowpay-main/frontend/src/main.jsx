import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./index.css";

if (typeof window !== "undefined") {
  window.global = window;
  window.Buffer = window.Buffer || Buffer;
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.browser = true;
  window.process.version = "";
  window.process.versions = {};
  window.process.nextTick = function (cb, ...args) {
    return Promise.resolve().then(() => cb(...args));
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
