import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AutomationToastProvider } from '@/components/automation/AutomationToast';
import AutomationLayout from '@/components/automation/AutomationLayout';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import AutomationDashboard from './automation/AutomationDashboard';
import AutomationQueue from './automation/AutomationQueue';
import AutomationRecipes from './automation/AutomationRecipes';
import AutomationBoardMapping from './automation/AutomationBoardMapping';
import AutomationSettings from './automation/AutomationSettings';
import PinterestCallback from './automation/PinterestCallback';

const AutomationIndex: React.FC = () => {
  const fetchInitialData = useAutomationStore(state => state.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <AutomationToastProvider>
      <AutomationLayout>
        <Routes>
          <Route index element={<AutomationDashboard />} />
          <Route path="queue" element={<AutomationQueue />} />
          <Route path="recipes" element={<AutomationRecipes />} />
          <Route path="boards" element={<AutomationBoardMapping />} />
          <Route path="settings" element={<AutomationSettings />} />
          <Route path="pinterest/callback" element={<PinterestCallback />} />
          <Route path="*" element={<Navigate to="/admin/automation" replace />} />
        </Routes>
      </AutomationLayout>
    </AutomationToastProvider>
  );
};

export default AutomationIndex;
