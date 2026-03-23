import { Layout, Menu } from 'antd'
import { DashboardOutlined, BarChartOutlined, ApartmentOutlined, LogoutOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import './Sidebar.css'

const { Sider } = Layout

export function Sidebar({ collapsed, onCollapse, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleMenuClick = (key) => {
    if (key === 'dashboard') {
      navigate('/dashboard')
    } else if (key === 'node') {
      navigate('/node')
    } else if (key === 'smr-rmr') {
      navigate('/smr-rmr')
    } else if (key === 'logout') {
      onLogout()
    }
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'node', icon: <ApartmentOutlined />, label: 'Node' },
    { key: 'smr-rmr', icon: <BarChartOutlined />, label: 'SMR/RMR' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }
  ]

  let selectedKey = 'dashboard'
  if (location.pathname.startsWith('/node')) {
    selectedKey = 'node'
  } else if (location.pathname.startsWith('/smr-rmr')) {
    selectedKey = 'smr-rmr'
  }

  return (
    <Sider 
      className="app-sidebar"
      collapsible 
      collapsed={collapsed} 
      onCollapse={onCollapse}
      theme="light"
      width={220}
      collapsedWidth={72}
    >
      <div className="sidebar-brand">
        <span className="sidebar-brand-text">MRML</span>
      </div>
      <Menu 
        theme="light" 
        mode="inline" 
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={(e) => handleMenuClick(e.key)}
      />
    </Sider>
  )
}