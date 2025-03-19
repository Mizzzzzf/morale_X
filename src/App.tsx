import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import CityMap from './components/CityMap';
import SalesAnalysis from './components/SalesAnalysis';
import TeamAnalysis from './components/TeamAnalysis';
import './App.css';

const { Header, Content } = Layout;

// 创建一个内部组件来使用useLocation钩子
const AppContent: React.FC = () => {
  const location = useLocation();
  
  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/city')) return '1';
    if (pathname.startsWith('/team')) return '2';
    if (pathname.startsWith('/sales')) return '3';
    return '1'; // 默认选中城市看板
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: 0 }}>
        <Menu theme="dark" mode="horizontal" selectedKeys={[getSelectedKey()]}>
          <Menu.Item key="1">
            <Link to="/city">城市看板</Link>
          </Menu.Item>
          <Menu.Item key="2">
            <Link to="/team">团队分析</Link>
          </Menu.Item>
          <Menu.Item key="3">
            <Link to="/sales">销售分析</Link>
          </Menu.Item>
        </Menu>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/city" replace />} />
          <Route path="/city" element={<CityMap />} />
          <Route path="/sales" element={<SalesAnalysis />} />
          <Route path="/team" element={<TeamAnalysis />} />
        </Routes>
      </Content>
    </Layout>
  );
};

// 主App组件
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
