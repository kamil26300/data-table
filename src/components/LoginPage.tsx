import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, User } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const success = login(values.username, values.password);
      if (success) {
        message.success('Login successful!');
        // Get the search params from the current URL
        const currentSearch = location.search;
        // If there are search params, append them to the dashboard URL
        navigate(`/dashboard${currentSearch}`);
      } else {
        message.error('Invalid credentials!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input 
              prefix={<User className="mr-2 h-5 w-5 text-gray-400" />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<Lock className="mr-2 h-5 w-5 text-gray-400" />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="large"
              loading={loading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center text-sm text-gray-600">
          Demo credentials: username: demo, password: demo
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;