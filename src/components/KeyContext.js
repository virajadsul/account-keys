"use client";

import { createContext, useContext, useState } from "react";
import { CodeBlock } from "./CodeBlock";

// Shares the freshly generated key with the setup guide, so its .env step
// shows the real key instead of a placeholder.
const KeyContext = createContext({ apiKey: null, setApiKey: () => {} });

export function KeyProvider({ children }) {
  const [apiKey, setApiKey] = useState(null);
  return <KeyContext.Provider value={{ apiKey, setApiKey }}>{children}</KeyContext.Provider>;
}

export function useApiKey() {
  return useContext(KeyContext);
}

export function EnvBlock({ title }) {
  const { apiKey } = useApiKey();
  const code = `# .env (your backend)\nMONGO_URI=mongodb://localhost:27017/your_db      # you already have this\nACCOUNTING_LICENSE_KEY=${apiKey || "acc_paste_your_key_here"}`;
  return <CodeBlock title={title} code={code} />;
}
