import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { useAuthStore } from './store/authStore';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Save the current URL (including query parameters) when redirecting to login
    return <Navigate to={`/${location.search}`} state={{ from: location }} />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;