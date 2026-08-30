import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface RouterCtx {
  path: string;
  query: URLSearchParams;
  navigate: (to: string) => void;
}
const Ctx = createContext<RouterCtx>({ path: "/", query: new URLSearchParams(), navigate: () => {} });
export const useRouter = () => useContext(Ctx);

function parse(): { path: string; query: URLSearchParams } {
  let raw = window.location.hash ? window.location.hash.slice(1) : window.location.pathname;
  if (!raw || raw === "") raw = "/";
  if (raw.startsWith("#")) raw = raw.slice(1);
  if (!raw.startsWith("/")) raw = "/" + raw;
  const qIndex = raw.indexOf("?");
  if (qIndex === -1) return { path: raw || "/", query: new URLSearchParams(window.location.search) };
  return { path: raw.slice(0, qIndex) || "/", query: new URLSearchParams(raw.slice(qIndex + 1)) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(parse);
  useEffect(() => {
    const onLocationChange = () => setState(parse());
    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
    };
  }, []);
  const navigate = (to: string) => {
    window.location.hash = to;
    window.scrollTo(0, 0);
  };
  return <Ctx.Provider value={{ path: state.path, query: state.query, navigate }}>{children}</Ctx.Provider>;
}
