import { useEffect, useRef, useState } from 'react'
import { Layout, Typography, Card, Table, Button, Alert, Spin, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sidebar } from '../components/Sidebar'
import './NodePage.css'

const { Content } = Layout
const { Title, Text } = Typography

function NodePage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nodeRecords, setNodeRecords] = useState([])
  const [errorText, setErrorText] = useState('')

  const isLoggingOutRef = useRef(false)

  const fetchNodeData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const response = await axios.get('/api/node/list')
      const result = Array.isArray(response.data) ? response.data : []
      setNodeRecords(result)
    } catch (error) {
      console.error('Node list fetch error:', error)
      setNodeRecords([])
      setErrorText('Failed to load node list data from API')
      message.error('Failed to load node list data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodeData()
  }, [])

  const handleLogout = async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    const token = localStorage.getItem('token')

    try {
      if (token) {
        await axios.post(
          '/api-auth/logout/',
          {},
          {
            headers: {
              Authorization: `Token ${token}`,
            },
          }
        )
      }
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user_detail')
      setIsLoggedIn(false)
      message.success('Logged out')
      navigate('/', { replace: true })
    }
  }

  const nodeColumns = [
    {
      title: 'Node S/N',
      dataIndex: 'node_sn',
      key: 'node_sn',
      render: (value) => <Text className="node-serial">{value || '-'}</Text>,
    },
    {
      title: 'Latitude',
      dataIndex: 'latitude',
      key: 'latitude',
      render: (value) => <Text>{value ?? '-'}</Text>,
    },
    {
      title: 'Longitude',
      dataIndex: 'longitude',
      key: 'longitude',
      render: (value) => <Text>{value ?? '-'}</Text>,
    },
  ]

  const tableData = nodeRecords.map((record, index) => ({
    key: `${record.id ?? index}-${record.node_sn ?? 'node'}`,
    id: record.id,
    node_sn: record.node_sn,
    latitude: record.latitude,
    longitude: record.longitude,
  }))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onLogout={handleLogout}
      />

      <Content>
        <div className="node-page">
          <div className="node-hero">
            <div className="node-header-row">
              <div className="node-header-left">
                <img src="/logo.png" alt="MRML Logo" className="node-logo" />
                <div>
                  <Title level={2} className="node-title">Node</Title>
                  <Text className="node-subtitle">Node inventory and geolocation data from /api/node/list</Text>
                </div>
              </div>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchNodeData}
                loading={loading}
                className="node-refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>

          {errorText ? (
            <Alert
              message="Unable to load node data"
              description={errorText}
              type="error"
              showIcon
              className="node-alert"
            />
          ) : null}

          <Card className="node-table-card" title={<span className="node-table-title">Node List</span>}>
            <Spin spinning={loading} tip="Loading node list...">
              <Table
                columns={nodeColumns}
                dataSource={tableData}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                className="node-table"
                locale={{ emptyText: 'No node records available' }}
                scroll={{ x: 640 }}
              />
            </Spin>
          </Card>
        </div>
      </Content>
    </Layout>
  )
}

export default NodePage
