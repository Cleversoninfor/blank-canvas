import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import MyOrders from "./pages/MyOrders";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import AdminOrders from "./pages/admin/Orders";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminCoupons from "./pages/admin/Coupons";
import AdminHours from "./pages/admin/Hours";
import AdminSettings from "./pages/admin/Settings";
import AdminSetup from "./pages/admin/Setup";
import AdminDeliveryZones from "./pages/admin/DeliveryZones";
import AdminAddons from "./pages/admin/Addons";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminReports from "./pages/admin/Reports";
import AdminBackup from "./pages/admin/Backup";
import AdminQRCodes from "./pages/admin/QRCodes";
import AdminEnvios from "./pages/admin/Envios";
import Kitchen from "./pages/Kitchen";
import DriverAccess from "./pages/DriverAccess";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDrivers from "./pages/admin/Drivers";
import AdminDriverReports from "./pages/admin/DriverReports";
import AdminPDV from "./pages/admin/PDV";
import AdminUsers from "./pages/admin/Users";
import PDVPublic from "./pages/PDVPublic";
import CardapioLocal from "./pages/CardapioLocal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cardapio-local" element={<CardapioLocal />} />
                <Route path="/install" element={<Install />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order/:id" element={<OrderStatus />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/hours" element={<AdminHours />} />
                <Route path="/admin/delivery-zones" element={<AdminDeliveryZones />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/setup" element={<AdminSetup />} />
                <Route path="/admin/addons" element={<AdminAddons />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/backup" element={<AdminBackup />} />
                <Route path="/admin/qrcodes" element={<AdminQRCodes />} />
                <Route path="/admin/envios" element={<AdminEnvios />} />
                <Route path="/admin/drivers" element={<AdminDrivers />} />
                <Route path="/admin/driver-reports" element={<AdminDriverReports />} />
                <Route path="/admin/pdv" element={<AdminPDV />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/pdv" element={<PDVPublic />} />
                <Route path="/driver" element={<DriverAccess />} />
                <Route path="/driver/dashboard" element={<DriverDashboard />} />
                <Route path="/kitchen" element={<Kitchen />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

