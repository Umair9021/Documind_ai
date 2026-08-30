import { RouterProvider, useRouter } from "./lib/router";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./components/ui";
import { AppShell } from "./components/AppShell";
import { CommandPalette } from "./components/CommandPalette";
import { Landing, Login, Signup, VerifyEmail, Welcome, NotFound } from "./pages/Public";
import { Dashboard, KnowledgeBases } from "./pages/Dashboard";
import { Workspace } from "./pages/Workspace";
import { Settings } from "./pages/Settings";
import { Playground, Inspector, Evaluation } from "./pages/Advanced";

function Routes() {
  const { path } = useRouter();
  const seg = path.split("/").filter(Boolean);

  // Public routes (no app shell)
  if (path === "/" || seg.length === 0) return <Landing />;
  if (path === "/login") return <Login />;
  if (path === "/signup") return <Signup />;
  if (path === "/verify") return <VerifyEmail />;
  if (path === "/welcome") return <Welcome />;

  // App routes (with shell)
  let content: React.ReactNode;
  if (path === "/dashboard") content = <Dashboard />;
  else if (path === "/knowledge-bases") content = <KnowledgeBases />;
  else if (seg[0] === "knowledge-bases" && seg[1]) {
    const id = seg[1];
    if (seg[2] === "sources" && seg[3]) content = <Workspace id={id} sub="sources" sourceId={seg[3]} />;
    else if (seg[2] === "sources") content = <Workspace id={id} sub="sources" />;
    else content = <Workspace id={id} sub="chat" />;
  } else if (path === "/settings") content = <Settings />;
  else if (path === "/advanced/playground") content = <Playground />;
  else if (path === "/advanced/inspector") content = <Inspector />;
  else if (path === "/advanced/evaluation") content = <Evaluation />;
  else content = <NotFound />;

  return <AppShell>{content}</AppShell>;
}

export default function App() {
  return (
    <RouterProvider>
      <ThemeProvider>
        <ToastProvider>
          <Routes />
          <CommandPalette />
        </ToastProvider>
      </ThemeProvider>
    </RouterProvider>
  );
}
