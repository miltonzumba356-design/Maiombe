import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Portfolio from '@/pages/Portfolio';
import Contracts from '@/pages/Contracts';
import ContractDraft from '@/pages/ContractDraft';
import Liabilities from '@/pages/Liabilities';
import Funding from '@/pages/Funding';
import Risk from '@/pages/Risk';
import Guarantees from '@/pages/Guarantees';
import Collection from '@/pages/Collection';
import Clients from '@/pages/Clients';
import Projects from '@/pages/Projects';
import Securities from '@/pages/Securities';
import Rates from '@/pages/Rates';
import BI from '@/pages/BI';
import Alerts from '@/pages/Alerts';
import ManagementCapital from '@/pages/ManagementCapital';
import ClientDetail from '@/pages/ClientDetail';
import Sign from '@/pages/Sign';
import Automations from '@/pages/Automations';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/assinar/:token" element={<Sign />} />
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="carteira" element={<Portfolio />} />
            <Route path="elaboracao" element={<ContractDraft />} />
            <Route path="contratos" element={<Contracts />} />
            <Route path="taxas" element={<Rates />} />
            <Route path="passivo" element={<Liabilities />} />
            <Route path="fontes" element={<Funding />} />
            <Route path="risco" element={<Risk />} />
            <Route path="garantias" element={<Guarantees />} />
            <Route path="cobranca" element={<Collection />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="projetos" element={<Projects />} />
            <Route path="titulos" element={<Securities />} />
            <Route path="bi" element={<BI />} />
            <Route path="alertas" element={<Alerts />} />
            <Route path="capital-gestao" element={<ManagementCapital />} />
            <Route path="automacoes" element={<Automations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
