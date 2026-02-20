import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { GardenProvider } from './context/GardenContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GardenBeds from './pages/GardenBeds';
import GardenMap from './pages/GardenMap';
import Analytics from './pages/Analytics';
import BedDetail from './pages/BedDetail';
import Harvests from './pages/Harvests';
import Admin from './pages/Admin';

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
        <GardenProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<PrivatePage><Dashboard /></PrivatePage>} />
              <Route path="/beds" element={<PrivatePage><GardenBeds /></PrivatePage>} />
              <Route path="/beds/:id" element={<PrivatePage><BedDetail /></PrivatePage>} />
              <Route path="/map" element={<PrivatePage><GardenMap /></PrivatePage>} />
              <Route path="/analytics" element={<PrivatePage><Analytics /></PrivatePage>} />
              <Route path="/harvests" element={<PrivatePage><Harvests /></PrivatePage>} />
              <Route path="/admin" element={<PrivatePage><Admin /></PrivatePage>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GardenProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
