import { useEffect, useState, useRef } from 'react'
import { Layout, Row, Col, Card, Select, Button, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { Sidebar } from '../components/Sidebar'
import './DisplacementPage.css'

const { Content } = Layout
const { Title } = Typography
const { Option } = Select

function DisplacementPerTimePage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nodeList, setNodeList] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [timeRange, setTimeRange] = useState('1h')
  const [chartData, setChartData] = useState([])

  const lastActivityTimeRef = useRef(Date.now())
  const autoRefreshIntervalRef = useRef(null)
  const inactivityCheckIntervalRef = useRef(null)
  const isLoggingOutRef = useRef(false)
  const chartRef1 = useRef(null)
  const chartRef2 = useRef(null)
  const chartRef3 = useRef(null)
  const chartGroupId = 'displacement-time-sync-group'

  const updateActivity = () => {
    lastActivityTimeRef.current = Date.now()
  }

  const getDayHourFromRange = (range) => {
    switch (range) {
      case '1h':
        return { day: 0, hour: 1 }
      case '3h':
        return { day: 0, hour: 3 }
      case '6h':
        return { day: 0, hour: 6 }
      case '12h':
        return { day: 0, hour: 12 }
      case '1d':
        return { day: 1, hour: 0 }
      default:
        return { day: 0, hour: 1 }
    }
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

  const fetchData = async (nodeId = selectedNode, range = timeRange) => {
    if (!nodeId) return

    const { day, hour } = getDayHourFromRange(range)

    try {
      const res = await axios.get(`/api/node/displacement/logs/${nodeId}/${day}/${hour}`)
      const raw = Array.isArray(res.data?.data) ? res.data.data : []

      const mapped = raw
        .map((item) => ({
          time: item.timestamp,
          cumulative_displacement_total: item.cumulative_displacement_total,
          cumulative_displacement_x: item.cumulative_displacement_x,
          cumulative_displacement_y: item.cumulative_displacement_y,
        }))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      setChartData(mapped)
    } catch (error) {
      console.error('Fetch displacement per-time data error:', error)
      message.error('Failed to load displacement chart data', 1)
      setChartData([])
    }
  }

  useEffect(() => {
    fetchNodeList()
  }, [])

  useEffect(() => {
    if (selectedNode) {
      fetchData(selectedNode, timeRange)
    }
  }, [selectedNode, timeRange])

  const handleRefresh = async () => {
    updateActivity()

    const nodes = await fetchNodeList()
    const nodeIdToUse = selectedNode ?? nodes[0]?.id

    if (nodeIdToUse) {
      fetchData(nodeIdToUse, timeRange)
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
        fetchData(selectedNode, timeRange)
      }
    }, 5 * 60 * 1000)

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [selectedNode, timeRange])

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

  useEffect(() => {
    const chart1 = chartRef1.current?.getEchartsInstance?.()
    const chart2 = chartRef2.current?.getEchartsInstance?.()
    const chart3 = chartRef3.current?.getEchartsInstance?.()

    if (!chart1 || !chart2 || !chart3) return

    chart1.group = chartGroupId
    chart2.group = chartGroupId
    chart3.group = chartGroupId

    echarts.connect(chartGroupId)

    return () => {
      echarts.disconnect(chartGroupId)
    }
  }, [chartData, selectedNode, timeRange])

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
                    Displacement
                  </Title>
                  <div className="dashboard-hero-subtitle">
                    แสดงผลข้อมูลการเคลื่อนที่ต่อช่วงเวลาของ Node ที่เลือก
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

                <Select
                  className="dashboard-select"
                  value={timeRange}
                  onChange={(value) => {
                    setTimeRange(value)
                    updateActivity()
                  }}
                >
                  <Option value="1h">1 Hour</Option>
                  <Option value="3h">3 Hours</Option>
                  <Option value="6h">6 Hours</Option>
                  <Option value="12h">12 Hours</Option>
                  <Option value="1d">1 Days</Option>
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

            <Row gutter={[20, 20]} align="stretch">
              <Col xs={24} md={24} className="dashboard-col">
                <Card title="Cumulative Displacement Total" className="chart-card dashboard-card">
                  <ReactECharts
                    ref={chartRef1}
                    option={buildChartOption(chartData, 'cumulative_displacement_total', 'cumulative_displacement_total', '#1677ff')}
                    style={{ height: 420 }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </Card>
              </Col>

              <Col xs={24} md={12} className="dashboard-col">
                <Card title="Cumulative Displacement X" className="chart-card dashboard-card">
                  <ReactECharts
                    ref={chartRef2}
                    option={buildChartOption(chartData, 'cumulative_displacement_x', 'cumulative_displacement_x', '#52c41a')}
                    style={{ height: 420 }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </Card>
              </Col>

              <Col xs={24} md={12} className="dashboard-col">
                <Card title="Cumulative Displacement Y" className="chart-card dashboard-card">
                  <ReactECharts
                    ref={chartRef3}
                    option={buildChartOption(chartData, 'cumulative_displacement_y', 'cumulative_displacement_y', '#fa8c16')}
                    style={{ height: 420 }}
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

export default DisplacementPerTimePage
