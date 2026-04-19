import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout, Typography, Card, Table, Row, Col, Button, Tag, Alert, Spin, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sidebar } from '../components/Sidebar'
import './SmrRmrPage.css'

const { Content } = Layout
const { Title, Text } = Typography

function SmrRmrPage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState([])
  const [errorText, setErrorText] = useState('')

  const isLoggingOutRef = useRef(false)

  const fetchSmrRmrData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const response = await axios.get('/api/node/smr-list/')
      const result = Array.isArray(response.data) ? response.data : []
      setRecords(result)
    } catch (error) {
      console.error('SMR/RMR fetch error:', error)
      setRecords([])
      setErrorText('Failed to load SMR/RMR data from API')
      message.error('Failed to load SMR/RMR data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSmrRmrData()
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

  const nodeCards = useMemo(() => {
    return records.map((record, index) => {
      const smrData = Array.isArray(record?.smr_data) ? record.smr_data : []

      const jointRows = smrData
        .filter((item) => item?.Joint)
        .map((item, rowIndex) => ({
          key: `${record.node_sn || index}-joint-${rowIndex}`,
          joint: item.Joint ?? '-',
          p: item.P ?? '-',
          t: item.T ?? '-',
          w: item.W ?? '-',
        }))

      const smrInfo = smrData.find((item) => item?.SMR_Case || item?.Support_Class || item?.Suggest_Support)
      const summary = record?.smr_summary ?? {}

      return {
        key: `${record.node_sn || index}`,
        nodeSn: record?.node_sn || '-',
        jointRows,
        smrMin: smrInfo?.SMR_min,
        smrCase: smrInfo?.SMR_Case || '-',
        supportClass: smrInfo?.Support_Class || '-',
        suggestSupport: smrInfo?.Suggest_Support || '-',
        summary,
      }
    })
  }, [records])

  const jointColumns = [
    {
      title: 'Joint',
      dataIndex: 'joint',
      key: 'joint',
      width: 120,
    },
    {
      title: 'P',
      dataIndex: 'p',
      key: 'p',
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: 'T',
      dataIndex: 't',
      key: 't',
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: 'W',
      dataIndex: 'w',
      key: 'w',
      render: (value) => <Text strong>{value}</Text>,
    },
  ]

  const getStabilityColor = (stability) => {
    if (!stability) return 'default'
    const normalized = String(stability).toLowerCase()

    if (normalized.includes('stable')) return 'green'
    if (normalized.includes('partially')) return 'orange'
    return 'red'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onLogout={handleLogout}
      />

      <Content>
        <div className="smr-rmr-page">
          <div className="smr-rmr-hero">
            <div className="smr-rmr-header-row">
              <div className="smr-rmr-header-left">
                <img src="/logo.png" alt="MRML Logo" className="smr-rmr-logo" />
                <div>
                  <Title level={2} className="smr-rmr-title">SMR/RMR Monitor</Title>
                  <Text className="smr-rmr-subtitle">แสดงผลข้อมูล SMR/RMR ของแต่ละ Node ที่ติดตั้งในระบบ</Text>
                </div>
              </div>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchSmrRmrData}
                loading={loading}
                className="smr-rmr-refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>

          {errorText ? (
            <Alert
              message="Unable to load data"
              description={errorText}
              type="error"
              showIcon
              className="smr-rmr-alert"
            />
          ) : null}

          <Spin spinning={loading} tip="Loading SMR/RMR data...">
            <Row gutter={[20, 20]}>
              {nodeCards.length === 0 && !loading ? (
                <Col span={24}>
                  <Card className="smr-rmr-empty-card">
                    <Title level={4} className="smr-rmr-empty-title">No SMR/RMR data available</Title>
                    <Text type="secondary">Check API endpoint response at /api/node/smr-list/ and try refresh again.</Text>
                  </Card>
                </Col>
              ) : null}

              {nodeCards.map((node) => (
                <Col key={node.key} xs={24} xl={12}>
                  <Card
                    className="smr-rmr-node-card"
                    title={<span className="smr-rmr-node-title">Node S/N: {node.nodeSn}</span>}
                  >
                    <div className="smr-rmr-section">
                      <Text className="smr-rmr-section-label">Joint Parameters</Text>
                      <Table
                        columns={jointColumns}
                        dataSource={node.jointRows}
                        pagination={false}
                        size="small"
                        className="smr-rmr-table"
                        locale={{ emptyText: 'No joint rows in smr_data' }}
                      />
                    </div>

                    <div className="smr-rmr-section smr-rmr-metric-grid">
                      <Card size="small" className="smr-rmr-mini-card">
                        <Text className="smr-rmr-mini-label">SMR_min</Text>
                        <Title level={4} className="smr-rmr-mini-value">{node.smrMin ?? '-'}</Title>
                      </Card>
                      <Card size="small" className="smr-rmr-mini-card">
                        <Text className="smr-rmr-mini-label">SMR Case</Text>
                        <Text className="smr-rmr-mini-text">{node.smrCase}</Text>
                      </Card>
                    </div>

                    <div className="smr-rmr-section">
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                          <Card size="small" className="smr-rmr-detail-card">
                            <Text className="smr-rmr-detail-title">Support Class</Text>
                            <Text>{node.supportClass}</Text>
                          </Card>
                        </Col>
                        <Col xs={24} md={12}>
                          <Card size="small" className="smr-rmr-detail-card">
                            <Text className="smr-rmr-detail-title">Suggested Support</Text>
                            <Text>{node.suggestSupport}</Text>
                          </Card>
                        </Col>
                      </Row>
                    </div>

                    <div className="smr-rmr-section smr-rmr-summary-block">
                      <Text className="smr-rmr-section-label">SMR Summary</Text>
                      <div className="smr-rmr-summary-grid">
                        <div>
                          <Text className="smr-rmr-summary-label">Rock Mass</Text>
                          <div>
                            <Tag color="blue">{node.summary?.rock_mass_description || '-'}</Tag>
                          </div>
                        </div>
                        <div>
                          <Text className="smr-rmr-summary-label">Stability</Text>
                          <div>
                            <Tag color={getStabilityColor(node.summary?.stability)}>
                              {node.summary?.stability || '-'}
                            </Tag>
                          </div>
                        </div>
                        <div>
                          <Text className="smr-rmr-summary-label">Failure</Text>
                          <div className="smr-rmr-summary-value">{node.summary?.failure || '-'}</div>
                        </div>
                        <div>
                          <Text className="smr-rmr-summary-label">Probability</Text>
                          <div className="smr-rmr-probability">{node.summary?.probability ?? '-'} </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Spin>
        </div>
      </Content>
    </Layout>
  )
}

export default SmrRmrPage
