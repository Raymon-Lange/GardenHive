import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import api, { setApiOwnerId } from '../lib/api';

const GardenContext = createContext(null);

export function GardenProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeGarden, setActiveGardenState] = useState(null); // null = own garden
  const [sharedGardens, setSharedGardens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    api.get('/access/shared')
      .then((r) => {
        setSharedGardens(r.data);
        // Helpers auto-select first shared garden on login
        if (user.role === 'helper' && r.data.length > 0) {
          setActiveGardenState(r.data[0]);
          setApiOwnerId(r.data[0].ownerId.toString());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const setActiveGarden = useCallback((garden) => {
    setActiveGardenState(garden);
    setApiOwnerId(garden ? garden.ownerId.toString() : null);
    queryClient.clear(); // clear cache so pages re-fetch with new ownerId
  }, [queryClient]);

  const isOwnGarden = !activeGarden;
  const permission = activeGarden?.permission || 'owner';
  const activeOwnerId = activeGarden?.ownerId?.toString() || user?.id;
  const isAwaitingInvite = user?.role === 'helper' && !loading && sharedGardens.length === 0;

  return (
    <GardenContext.Provider value={{
      activeGarden, sharedGardens, loading,
      activeOwnerId, isOwnGarden, permission,
      isAwaitingInvite,
      setActiveGarden,
    }}>
      {children}
    </GardenContext.Provider>
  );
}

export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be used within GardenProvider');
  return ctx;
}
