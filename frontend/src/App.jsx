import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GardenBeds from './pages/GardenBeds';
import BedDetail from './pages/BedDetail';
import Harvests from './pages/Harvests';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PrivatePage({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<PrivatePage><Dashboard /></PrivatePage>} />
            <Route path="/beds" element={<PrivatePage><GardenBeds /></PrivatePage>} />
            <Route path="/beds/:id" element={<PrivatePage><BedDetail /></PrivatePage>} />
            <Route path="/harvests" element={<PrivatePage><Harvests /></PrivatePage>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
