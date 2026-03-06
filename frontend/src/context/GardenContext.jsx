import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import api, { setApiOwnerId } from '../lib/api';

const GardenContext = createContext(null);

export function GardenProvider({ children }) {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  // ── Shared garden state (helper/owner viewing another owner's garden) ──────
  const [activeGarden, setActiveGardenState] = useState(null); // null = own garden
  const [sharedGardens, setSharedGardens] = useState([]);
  const [loading, setLoading] = useState(!!user);

  // ── Own garden state (owner) ──────────────────────────────────────────────
  const [gardens, setGardens] = useState([]);
  // ownGardenId: which of the owner's own gardens is selected
  const [ownGardenId, setOwnGardenId] = useState(user?.activeGardenId || null);

  // ── Helper's independent garden selection within a shared owner ───────────
  const [helperGardenId, setHelperGardenId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const sharedPromise = api.get('/access/shared')
      .then((r) => {
        setSharedGardens(r.data);
        // Helpers auto-select first shared owner on login
        if (user.role === 'helper' && r.data.length > 0) {
          setActiveGardenState(r.data[0]);
          setApiOwnerId(r.data[0].ownerId.toString());
          setHelperGardenId(r.data[0].activeGardenId || r.data[0].gardens?.[0]?._id || null);
        }
      })
      .catch(() => {});

    // Owners fetch their own garden list
    const gardensPromise = user.role === 'owner'
      ? api.get('/gardens')
        .then((r) => {
          setGardens(r.data);
          // Set ownGardenId from user.activeGardenId or fall back to first garden
          setOwnGardenId((prev) => prev || user.activeGardenId || r.data[0]?._id || null);
        })
        .catch(() => {})
      : Promise.resolve();

    Promise.all([sharedPromise, gardensPromise]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Switch which shared owner is active (existing helper/shared-garden flow)
  const setActiveGarden = useCallback((garden) => {
    setActiveGardenState(garden);
    setApiOwnerId(garden ? garden.ownerId.toString() : null);
    if (garden) {
      // Default helper's garden to the owner's active garden or first garden
      setHelperGardenId(garden.activeGardenId || garden.gardens?.[0]?._id || null);
    }
    queryClient.clear();
  }, [queryClient]);

  const isOwnGarden = !activeGarden;

  // currentGardenId: own garden when viewing own, shared garden when viewing shared
  const currentGardenId = isOwnGarden ? ownGardenId : helperGardenId;

  // helperGardens: list of the active shared owner's gardens (for helper switcher)
  const helperGardens = !isOwnGarden ? (activeGarden?.gardens || []) : [];

  // Re-fetch owner's gardens and sync active garden from server
  const refreshGardens = useCallback(async () => {
    if (user?.role !== 'owner') return;
    try {
      const [gardensRes, meRes] = await Promise.all([
        api.get('/gardens'),
        api.get('/auth/me'),
      ]);
      setGardens(gardensRes.data);
      updateUser(meRes.data);
      setOwnGardenId(meRes.data.activeGardenId || gardensRes.data[0]?._id || null);
      queryClient.clear();
    } catch (err) {
      console.error('Failed to refresh gardens:', err);
    }
  }, [user?.role, updateUser, queryClient]);

  // Switch to a different garden within the current context
  const setCurrentGardenId = useCallback(async (id) => {
    if (isOwnGarden) {
      // Owner switching their own active garden — persist to server
      try {
        await api.put('/auth/me/active-garden', { gardenId: id });
        updateUser({ activeGardenId: id });
        setOwnGardenId(id);
        queryClient.clear();
      } catch (err) {
        console.error('Failed to switch garden:', err);
      }
    } else {
      // Helper switching between owner's gardens — local only
      setHelperGardenId(id);
      queryClient.clear();
    }
  }, [isOwnGarden, queryClient, updateUser]);

  const permission = activeGarden?.permission || 'owner';
  const activeOwnerId = activeGarden?.ownerId?.toString() || user?.id;
  const isAwaitingInvite = user?.role === 'helper' && !loading && sharedGardens.length === 0;

  return (
    <GardenContext.Provider value={{
      // Existing (unchanged interface for backwards compatibility)
      activeGarden, sharedGardens, loading,
      activeOwnerId, isOwnGarden, permission,
      isAwaitingInvite,
      setActiveGarden,
      // New — multi-garden support
      gardens,
      currentGardenId,
      setCurrentGardenId,
      refreshGardens,
      helperGardens,
    }}>
      {children}
    </GardenContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be used within GardenProvider');
  return ctx;
}
