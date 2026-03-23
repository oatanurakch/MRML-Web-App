import { Layout, Menu } from 'antd'
import { DashboardOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './Sidebar.css'

const { Sider } = Layout

export function Sidebar({ collapsed, onCollapse, onLogout }) {
  const navigate = useNavigate()

  const handleMenuClick = (key) => {
    if (key === 'dashboard') {
      navigate('/dashboard')
    } else if (key === 'logout') {
      onLogout()
    }
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }
  ]

  const selectedKey = 'dashboard'

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