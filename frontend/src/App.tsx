import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AppShell } from "./components/AppShell";
import { NotFoundPage } from "./components/NotFoundPage";
import ContactListPage from "./contacts/ContactListPage";
import ContactPage from "./contacts/ContactPage";
import DashboardPage from "./dashboard/DashboardPage";
import DealListPage from "./deals/DealListPage";
import DealPage from "./deals/DealPage";
import OrganizationListPage from "./organizations/OrganizationListPage";
import OrganizationPage from "./organizations/OrganizationPage";
import PipelinePage from "./pipeline/PipelinePage";

export const routes = [
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: DashboardPage },
      { path: "organizations", Component: OrganizationListPage },
      { path: "organizations/:id", Component: OrganizationPage },
      { path: "contacts", Component: ContactListPage },
      { path: "contacts/:id", Component: ContactPage },
      { path: "deals", Component: DealListPage },
      { path: "deals/:id", Component: DealPage },
      { path: "pipeline", Component: PipelinePage },
      { path: "*", Component: () => <NotFoundPage /> },
    ],
  },
];

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      // Errors show at once: the banner for an unreachable server, or the screen's own message.
      queries: { retry: false, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

const router = createBrowserRouter(routes);
const queryClient = makeQueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
