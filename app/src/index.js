import React from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root"));

root.render(
  <Auth0Provider
    domain="dev-4li0jaybll1loar3.us.auth0.com"
    clientId="Nn8x33re82fVuDoiaktqzZQurMz1Eavx"
    redirectUri={window.location.origin}
  >
    <App />
  </Auth0Provider>
);
