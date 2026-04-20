import { useEffect, useRef, useState } from 'react'
import { Layout, Row, Col, Card, Select, Button, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import { Sidebar } from '../components/Sidebar'
import './CumulativeDisplacementPage.css'

const { Content } = Layout
const { Title } = Typography
const { Option } = Select

function CumulativeDisplacementPage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nodeList, setNodeList] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [sensorData, setSensorData] = useState([])

  const lastActivityTimeRef = useRef(Date.now())
  const autoRefreshIntervalRef = useRef(null)
  const inactivityCheckIntervalRef = useRef(null)
  const isLoggingOutRef = useRef(false)

  const updateActivity = () => {
    lastActivityTimeRef.current = Date.now()
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return timestamp

    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('en-US', { month: 'short' })
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${day} ${month} ${year} ${hours}:${minutes}`
  }

  const buildChartOption = (data, dataKey, lineName, color) => {
    const total = data.length
    const visibleCount = 20
    const startIndex = Math.max(0, total - visibleCount)
    const endIndex = Math.max(0, total - 1)

    return {
      animation: true,
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const point = params?.[0]
          if (!point) return ''

          return `
            <div>
              <div><strong>${formatDateTime(point.axisValue)}</strong></div>
              <div>${lineName}: ${point.data ?? '-'}</div>
            </div>
          `
        },
      },
      grid: {
        top: 30,
        left: 50,
        right: 24,
        bottom: 100,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((item) => item.time),
        axisLabel: {
          rotate: 20,
          margin: 14,
          formatter: (value) => formatDateTime(value),
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
      },
      dataZoom: [
        {
          type: 'slider',
          startValue: startIndex,
          endValue: endIndex,
          bottom: 10,
          height: 16,
        },
        {
          type: 'inside',
          startValue: startIndex,
          endValue: endIndex,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
      ],
      series: [
        {
          name: lineName,
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.map((item) => item[dataKey]),
          lineStyle: {
            width: 2,
            color,
          },
          itemStyle: {
            color,
          },
          areaStyle: {
            color: `${color}22`,
          },
        },
      ],
    }
  }

  const fetchNodeList = async () => {
    try {
      const res = await axios.get('/api/node/list/')
      const nodes = Array.isArray(res.data) ? res.data : []

      setNodeList(nodes)
      if (nodes.length > 0) {
        setSelectedNode((prev) => prev ?? nodes[0].id)
      }

      return nodes
    } catch (error) {
      console.error('Fetch node list error:', error)
      message.error('Failed to load node list', 1)
      return []
    }
  }

  const fetchSensorData = async (nodeId = selectedNode) => {
    if (!nodeId) return

    try {
      const res = await axios.get(`/api/node/sensordatas/logs/${nodeId}/`)
      const raw = Array.isArray(res.data?.data) ? res.data.data : []

      const mapped = raw
        .map((item) => ({
          time: item.timestamp,
          a: item.a,
          b: item.b,
          c: item.c,
        }))
        .sort((first, second) => new Date(first.time).getTime() - new Date(second.time).getTime())

      setSensorData(mapped)
    } catch (error) {
      console.error('Fetch cumulative displacement data error:', error)
      message.error('Failed to load cumulative displacement data', 1)
      setSensorData([])
    }
  }

  useEffect(() => {
    fetchNodeList()
  }, [])

  useEffect(() => {
    if (selectedNode) {
      fetchSensorData(selectedNode)
    }
  }, [selectedNode])

  const handleRefresh = async () => {
    updateActivity()

    const nodes = await fetchNodeList()
    const nodeIdToUse = selectedNode ?? nodes[0]?.id

    if (nodeIdToUse) {
      fetchSensorData(nodeIdToUse)
    }
  }

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

  useEffect(() => {
    autoRefreshIntervalRef.current = setInterval(() => {
      if (selectedNode) {
        fetchSensorData(selectedNode)
      }
    }, 5 * 60 * 1000)

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [selectedNode])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    const handleUserActivity = () => {
      updateActivity()
    }

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity)
    })

    inactivityCheckIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const inactiveTime = now - lastActivityTimeRef.current

      if (inactiveTime >= 10 * 60 * 1000) {
        message.warning('NO ACTIVITY FOR 10 MINUTES', 1)
        handleLogout()
      }
    }, 1000)

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })

      if (inactivityCheckIntervalRef.current) {
        clearInterval(inactivityCheckIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    updateActivity()
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onLogout={handleLogout}
      />
      <Content>
        <div className="cumulative-page">
          <div className="cumulative-hero">
            <div className="cumulative-hero-top">
              <div className="cumulative-header-left">
                <img src="/logo.png" alt="MRML Logo" className="cumulative-logo" />
                <div>
                  <Title level={2} className="cumulative-title cumulative-title-light">
                    Cumulative Displacement
                  </Title>
                  <div className="cumulative-hero-subtitle">
                    แสดงผลข้อมูลค่า A, B และ C เทียบกับเวลาในแต่ละอุปกรณ์
                  </div>
                </div>
              </div>
            </div>

            <div className="cumulative-toolbar">
              <div className="cumulative-filters">
                <Select
                  placeholder="Select Node"
                  className="cumulative-select"
                  value={selectedNode}
                  onChange={(value) => {
                    setSelectedNode(value)
                    updateActivity()
                  }}
                >
                  {nodeList.map((node) => (
                    <Option key={node.id} value={node.id}>
                      NODE S/N : {node.node_sn}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="cumulative-actions">
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    handleRefresh()
                    message.loading('REFRESHING...', 1)
                  }}
                  className="cumulative-refresh-btn"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Row gutter={[20, 20]} align="stretch">
              <Col xs={24} lg={12} className="cumulative-col">
                <Card title="Cumulative Laser A" className="cumulative-chart-card">
                  <ReactECharts
                    option={buildChartOption(sensorData, 'a', 'A', '#2563eb')}
                    style={{ height: 360 }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12} className="cumulative-col">
                <Card title="Cumulative Laser B" className="cumulative-chart-card">
                  <ReactECharts
                    option={buildChartOption(sensorData, 'b', 'B', '#0f766e')}
                    style={{ height: 360 }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </Card>
              </Col>
              <Col xs={24} className="cumulative-col">
                <Card title="Cumulative Laser C" className="cumulative-chart-card">
                  <ReactECharts
                    option={buildChartOption(sensorData, 'c', 'C', '#c2410c')}
                    style={{ height: 380 }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </Content>
    </Layout>
  )
}

export default CumulativeDisplacementPage
