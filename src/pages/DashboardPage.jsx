import { useEffect, useState, useRef } from 'react'
import { Row, Col, Card, Select, Button, Typography, message } from 'antd'
import { ReloadOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'


const { Title } = Typography
const { Option } = Select

function DashboardPage({ setIsLoggedIn }) {
  const navigate = useNavigate()

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
  const chartGroupId = 'dashboard-sync-group'

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
      case '7d':
        return { day: 7, hour: 0 }
      case '30d':
        return { day: 30, hour: 0 }
      case '3M':
        return { day: 90, hour: 0 }
      case '1Y':
        return { day: 365, hour: 0 }
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
    const visibleCount = 10
    const endPercent = total > 0 ? Math.min(100, (visibleCount / total) * 100) : 100

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
        }
      },
      grid: {
        top: 30,
        left: 50,
        right: 30,
        bottom: 80
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((item) => item.time),
        axisLabel: {
          rotate: 20,
          formatter: (value) => formatDateTime(value)
        }
      },
      yAxis: {
        type: 'value',
        scale: true
      },
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: endPercent,
          bottom: 20,
          height: 20
        },
        {
          type: 'inside',
          start: 0,
          end: endPercent,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      series: [
        {
          name: lineName,
          type: 'line',
          smooth: true,
          showSymbol: true,
          data: data.map((item) => item[dataKey]),
          lineStyle: {
            width: 2,
            color: color
          },
          itemStyle: {
            color: color
          }
        }
      ]
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
      const res = await axios.get(`/api/node/sensordatas/logs/${nodeId}/${day}/${hour}`)

      const raw = Array.isArray(res.data?.data) ? res.data.data : []

      const mapped = raw.map((item) => ({
        time: item.timestamp,
        translation_x: item.translation_x,
        translation_y: item.translation_y,
        zeta: item.zeta
      }))

      setChartData(mapped)
    } catch (error) {
      console.error('Fetch chart data error:', error)
      message.error('Failed to load chart data', 1)
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
              Authorization: `Token ${token}`
            }
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
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f7fa' }}>
      <Title level={2} style={{ marginBottom: 20 }}>
        MRML Web App
      </Title>

      <Row align="middle" justify="space-between" style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <div style={{ display: 'flex', gap: 16, maxWidth: 700 }}>
            <Select
              placeholder="Select Node"
              style={{ width: 320 }}
              value={selectedNode}
              onChange={(value) => {
                setSelectedNode(value)
                updateActivity()
              }}
            >
              {nodeList.map((node) => (
                <Option key={node.id} value={node.id}>
                  NODE : {node.id}
                </Option>
              ))}
            </Select>

            <Select
              style={{ width: 320, height: 40 }}
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
              <Option value="1d">1 Day</Option>
              <Option value="7d">7 Days</Option>
              <Option value="30d">30 Days</Option>
              <Option value="3M">3 Months</Option>
              <Option value="1Y">1 Year</Option>
            </Select>
          </div>
        </Col>

        <Col flex="none">
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                handleRefresh()
                message.loading('REFRESHING...', 1)
              }}
              style={{ width: 60, height: 60 }}
            />
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={() => {
                handleLogout()
                message.warning('LOGGING OUT...', 1)
              }}
              style={{ width: 60, height: 60 }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Raw_Data_Chart">
            <ReactECharts
              ref={chartRef1}
              option={buildChartOption(chartData, 'translation_x', 'translation_x', '#1677ff')}
              style={{ height: 320 }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Translation_Chart">
            <ReactECharts
              ref={chartRef2}
              option={buildChartOption(chartData, 'translation_y', 'translation_y', '#52c41a')}
              style={{ height: 320 }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Zeta_Chart">
            <ReactECharts
              ref={chartRef3}
              option={buildChartOption(chartData, 'zeta', 'zeta', '#fa8c16')}
              style={{ height: 320 }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ height: '100%' }} />
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage