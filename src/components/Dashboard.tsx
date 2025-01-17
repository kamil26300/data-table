import React from 'react';
import { Layout, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import DataTable from './DataTable';
import { LogOut } from 'lucide-react';

const { Header, Content } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-md px-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Domain Data Dashboard</h1>
        <Button
          type="text"
          icon={<LogOut className="h-5 w-5" />}
          onClick={handleLogout}
          className="flex items-center"
        >
          Logout
        </Button>
      </Header>
      <Content className="bg-gray-50">
        <DataTable />
      </Content>
    </Layout>
  );
};

export default Dashboard;