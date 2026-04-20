import { useEffect, useState, useRef } from 'react'
import { Layout, Row, Col, Card, Select, Button, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import { Sidebar } from '../components/Sidebar'
import './DisplacementPage.css'

const { Content } = Layout
const { Title } = Typography
const { Option } = Select

function DisplacementPage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nodeList, setNodeList] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [chartData, setChartData] = useState([])
  const [latestDisplacementRate, setLatestDisplacementRate] = useState(null)
  const [measuredDuration, setMeasuredDuration] = useState('0 days, 0 hours, 0 minutes, 0 seconds')
  const [measurementStartTime, setMeasurementStartTime] = useState('-')
  const [measurementEndTime, setMeasurementEndTime] = useState('-')

  const lastActivityTimeRef = useRef(Date.now())
  const autoRefreshIntervalRef = useRef(null)
  const inactivityCheckIntervalRef = useRef(null)
  const isLoggingOutRef = useRef(false)
  const chartRef1 = useRef(null)

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
        right: 30,
        bottom: 110,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((item) => item.time),
        axisLabel: {
          rotate: 20,
          margin: 16,
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
          height: 18,
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
          symbolSize: 7,
          data: data.map((item) => item[dataKey]),
          lineStyle: {
            width: 2,
            color: color,
          },
          itemStyle: {
            color: color,
          },
        },
      ],
    }
  }

  const formatMetricValue = (value, decimalPlaces = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-'
    }

    return Number(value).toFixed(decimalPlaces)
  }

  const formatDurationFromSeconds = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number.isFinite(totalSeconds) ? Math.floor(totalSeconds) : 0)
    const days = Math.floor(safeSeconds / (24 * 60 * 60))
    const hours = Math.floor((safeSeconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((safeSeconds % (60 * 60)) / 60)
    const seconds = safeSeconds % 60

    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`
  }

  const buildDurationFromTimestamps = (data) => {
    const validTimes = data
      .map((item) => new Date(item.time).getTime())
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => a - b)

    if (validTimes.length < 2) {
      return formatDurationFromSeconds(0)
    }

    const diffSeconds = Math.floor((validTimes[validTimes.length - 1] - validTimes[0]) / 1000)
    return formatDurationFromSeconds(diffSeconds)
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

  const fetchData = async (nodeId = selectedNode) => {
    if (!nodeId) return

    try {
      const res = await axios.get(`/api/node/displacement/logs/${nodeId}/`)
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      const apiTimeDiff = typeof res.data?.TimeDiff === 'string' ? res.data.TimeDiff.trim() : ''

      const mapped = raw
        .map((item) => ({
          time: item.timestamp,
          displacement_rate: item.displacement_rate,
        }))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      const latestPoint = mapped.length > 0 ? mapped[mapped.length - 1] : null
      const durationToShow = apiTimeDiff || buildDurationFromTimestamps(mapped)
      const firstPoint = mapped.length > 0 ? mapped[0] : null

      setChartData(mapped)
      setLatestDisplacementRate(latestPoint?.displacement_rate ?? null)
      setMeasuredDuration(durationToShow)
      setMeasurementStartTime(firstPoint?.time ? formatDateTime(firstPoint.time) : '-')
        setMeasurementEndTime(latestPoint?.time ? formatDateTime(latestPoint.time) : '-')
    } catch (error) {
      console.error('Fetch displacement data error:', error)
      message.error('Failed to load displacement chart data', 1)
      setChartData([])
      setLatestDisplacementRate(null)
      setMeasuredDuration('0 days, 0 hours, 0 minutes, 0 seconds')
      setMeasurementStartTime('-')
      setMeasurementEndTime('-')
    }
  }

  useEffect(() => {
    fetchNodeList()
  }, [])

  useEffect(() => {
    if (selectedNode) {
      fetchData(selectedNode)
    }
  }, [selectedNode])

  const handleRefresh = async () => {
    updateActivity()

    const nodes = await fetchNodeList()
    const nodeIdToUse = selectedNode ?? nodes[0]?.id

    if (nodeIdToUse) {
      fetchData(nodeIdToUse)
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
        fetchData(selectedNode)
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
        <div className="dashboard-page">
          <div className="dashboard-hero">
            <div className="dashboard-hero-top">
              <div className="dashboard-header-left">
                <img src="/logo.png" alt="MRML Logo" className="dashboard-logo" />
                <div>
                  <Title level={2} className="dashboard-title dashboard-title-light">
                    Displacement Rate
                  </Title>
                  <div className="dashboard-hero-subtitle">
                    แสดงผลข้อมูลการเคลื่อนที่ต่อเวลาของแต่ละอุปกรณ์ชุดตรวจวัด
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-toolbar">
              <div className="dashboard-filters">
                <Select
                  placeholder="Select Node"
                  className="dashboard-select"
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

              <div className="dashboard-actions">
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    handleRefresh()
                    message.loading('REFRESHING...', 1)
                  }}
                  className="refresh-btn"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Row gutter={[20, 20]} align="stretch" className="metric-summary-row">
              <Col xs={24} md={12} className="dashboard-col">
                <Card className="dashboard-card metric-card metric-card-rate">
                  <div className="metric-card-label">Latest Displacement Rate</div>
                  <Title level={2} className="metric-card-value">
                    {formatMetricValue(latestDisplacementRate)}
                  </Title>
                  <div className="metric-card-subtitle">Most recent measurement</div>
                </Card>
              </Col>
              <Col xs={24} md={12} className="dashboard-col">
                <Card className="dashboard-card metric-card metric-card-days">
                  <div className="metric-card-label">Measured Duration</div>
                  <Title level={2} className="metric-card-value metric-card-value-duration">
                    {measuredDuration}
                  </Title>
                  <div className="metric-card-subtitle">Start Time: <span className="metric-card-start-time">{measurementStartTime}</span></div>
                  <div className="metric-card-subtitle">Last Time: <span className="metric-card-start-time">{measurementEndTime}</span></div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[20, 20]} align="stretch" className="chart-section-row">
              <Col xs={24} md={24} className="dashboard-col">
                <Card title="Cumulative Displacement Total" className="chart-card dashboard-card">
                  <ReactECharts
                    ref={chartRef1}
                    option={buildChartOption(chartData, 'displacement_rate', 'displacement_rate', '#1677ff')}
                    style={{ height: 460 }}
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

export default DisplacementPage
