import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import MarketPage from "./pages/MarketPage";
import RetailPage from "./pages/RetailPage";
import PricingPage from "./pages/PricingPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="ozellikler" element={<FeaturesPage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="giyim" element={<RetailPage />} />
        <Route path="fiyatlandirma" element={<PricingPage />} />
        <Route path="hakkimizda" element={<AboutPage />} />
        <Route path="iletisim" element={<ContactPage />} />
        <Route path="gizlilik" element={<PrivacyPage />} />
        <Route path="kullanim-kosullari" element={<TermsPage />} />
      </Route>
    </Routes>
  );
}
