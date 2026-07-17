import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RouteChangeSpinner } from "@/components/RouteChangeSpinner";
import { I18nProvider } from "@/lib/i18n";
import { NewTeamPage } from "@/pages/NewTeamPage";
import { TeamSelectionPage } from "@/pages/TeamSelectionPage";
import { EditItemPage } from "@/pages/team/EditItemPage";
import { EditLocationPage } from "@/pages/team/EditLocationPage";
import { NewItemPage } from "@/pages/team/NewItemPage";
import { NewLocationPage } from "@/pages/team/NewLocationPage";
import { TeamItemsPage } from "@/pages/team/TeamItemsPage";
import { TeamLocationsPage } from "@/pages/team/TeamLocationsPage";
import { TeamReportsPage } from "@/pages/team/TeamReportsPage";
import { TeamSettingsPage } from "@/pages/team/TeamSettingsPage";
import { TeamAdjustPage } from "@/pages/team/TeamAdjustPage";
import { TeamMovePage } from "@/pages/team/TeamMovePage";
import { TeamStockInPage } from "@/pages/team/TeamStockInPage";
import { TeamStockByLocationPage } from "@/pages/team/TeamStockByLocationPage";
import { TeamStockOutPage } from "@/pages/team/TeamStockOutPage";
import { TeamTransactionsPage } from "@/pages/team/TeamTransactionsPage";
import { TeamClientsPage } from "@/pages/team/TeamClientsPage";
import { TeamVehiclesPage } from "@/pages/team/TeamVehiclesPage";
import { TeamWorkshopServicesPage } from "@/pages/team/TeamWorkshopServicesPage";
import { TeamServiceOrdersPage } from "@/pages/team/TeamServiceOrdersPage";
import { TeamServiceOrderDetailPage } from "@/pages/team/TeamServiceOrderDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TeamSelectionPage />} />
      <Route path="/teams/new" element={<NewTeamPage />} />
      <Route
        path="/teams/:teamId/service-orders"
        element={<TeamServiceOrdersPage />}
      />
      <Route
        path="/teams/:teamId/service-orders/:orderId"
        element={<TeamServiceOrderDetailPage />}
      />
      <Route path="/teams/:teamId/clients" element={<TeamClientsPage />} />
      <Route path="/teams/:teamId/vehicles" element={<TeamVehiclesPage />} />
      <Route
        path="/teams/:teamId/workshop-services"
        element={<TeamWorkshopServicesPage />}
      />
      <Route path="/teams/:teamId/items" element={<TeamItemsPage />} />
      <Route path="/teams/:teamId/items/new" element={<NewItemPage />} />
      <Route
        path="/teams/:teamId/items/:itemId/edit"
        element={<EditItemPage />}
      />
      <Route path="/teams/:teamId/locations" element={<TeamLocationsPage />} />
      <Route
        path="/teams/:teamId/locations/new"
        element={<NewLocationPage />}
      />
      <Route
        path="/teams/:teamId/locations/:locationId/edit"
        element={<EditLocationPage />}
      />
      <Route path="/teams/:teamId/stock-in" element={<TeamStockInPage />} />
      <Route path="/teams/:teamId/stock-out" element={<TeamStockOutPage />} />
      <Route path="/teams/:teamId/adjust" element={<TeamAdjustPage />} />
      <Route path="/teams/:teamId/move" element={<TeamMovePage />} />
      <Route
        path="/teams/:teamId/transactions"
        element={<TeamTransactionsPage />}
      />
      <Route
        path="/teams/:teamId/stock-by-location"
        element={<TeamStockByLocationPage />}
      />
      <Route path="/teams/:teamId/reports" element={<TeamReportsPage />} />
      <Route path="/teams/:teamId/settings" element={<TeamSettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <RouteChangeSpinner />
        <AppRoutes />
      </BrowserRouter>
    </I18nProvider>
  );
}
