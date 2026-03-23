import { useEffect, useState, useRef } from 'react'
import { Layout, Row, Col, Card, Select, Button, Typography, message, DatePicker, TimePicker, } from 'antd'
import { ReloadOutlined, LogoutOutlined, DownloadOutlined, } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { Sidebar } from '../components/Sidebar'
import './DashboardPage.css'


const { Content } = Layout
const { Title } = Typography
const { Option } = Select

function DashboardPage({ setIsLoggedIn }) {
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nodeList, setNodeList] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [timeRange, setTimeRange] = useState('1h')
  const [chartData, setChartData] = useState([])

  const [fromDate, setFromDate] = useState(dayjs().subtract(1, 'day'))
  const [fromTime, setFromTime] = useState(dayjs().startOf('day'))
  const [toDate, setToDate] = useState(dayjs())
  const [toTime, setToTime] = useState(dayjs())
  const [exportLoading, setExportLoading] = useState(false)

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

  const combineDateTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return null

    return dayjs(dateValue)
      .hour(dayjs(timeValue).hour())
      .minute(dayjs(timeValue).minute())
      .second(dayjs(timeValue).second())
      .millisecond(0)
  }

  const formatDateTimeForApi = (value) => {
    return dayjs(value).format('YYYY-MM-DDTHH:mm:ss')
  }

  const buildChartOption = (data, dataKey, lineName, color) => {
    const total = data.length
    const visibleCount = 10

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
      const res = await axios.get(`/api/node/sensordatas/logs/${nodeId}/${day}/${hour}`)

      const raw = Array.isArray(res.data?.data) ? res.data.data : []

      const mapped = raw
        .map((item) => ({
          time: item.timestamp,
          translation_x: item.translation_x,
          translation_y: item.translation_y,
          zeta: item.zeta,
        }))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

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

  const handleDownloadCSV = async () => {
    if (!selectedNode) {
      message.warning('Please select node first')
      return
    }

    const fromDateTime = combineDateTime(fromDate, fromTime)
    const toDateTime = combineDateTime(toDate, toTime)

    if (!fromDateTime || !toDateTime) {
      message.warning('Please select date and time range')
      return
    }

    if (fromDateTime.isAfter(toDateTime)) {
      message.warning('From date/time must be earlier than To date/time')
      return
    }

    setExportLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('node_sn_id', String(selectedNode))
      formData.append('date_from', formatDateTimeForApi(fromDateTime))
      formData.append('date_to', formatDateTimeForApi(toDateTime))

      const res = await axios.post('/api/node/export/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const success = res.data?.success
      const downloadUrl = res.data?.download_url
      const record_count = res.data?.record_count ?? 0

      if (!success || !downloadUrl) {
        message.error('Download link not found')
        return
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `node_${selectedNode}_data.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      message.success(`Export ready  (${res.data?.record_count ?? 0}) records`)
    } catch (error) {
      console.error('Export CSV error:', error)
      message.error('Failed to download file')
    } finally {
      setExportLoading(false)
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
        <div className="dashboard-hero">
          <div className="dashboard-hero-top">
            <div className="dashboard-header-left">
              <img src="/logo.png" alt="MRML Logo" className="dashboard-logo" />
              <div>
                <Title level={2} className="dashboard-title dashboard-title-light">
                  MRML Application
                </Title>
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
                <Option value="1d">1 Day</Option>
                <Option value="7d">7 Days</Option>
                <Option value="30d">30 Days</Option>
                <Option value="3M">3 Months</Option>
                <Option value="1Y">1 Year</Option>
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
                > Refresh
                </Button>
            </div>
          </div>

          <Row gutter={[20, 20]} align="stretch">
            <Col xs={24} md={12} className="dashboard-col">
              <Card title="Raw Data Chart" className="chart-card dashboard-card">
                <ReactECharts
                  ref={chartRef1}
                  option={buildChartOption(chartData, 'translation_x', 'translation_x', '#1677ff')}
                  style={{ height: 320 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Card>
            </Col>

            <Col xs={24} md={12} className="dashboard-col">
              <Card title="Translation Chart" className="chart-card dashboard-card">
                <ReactECharts
                  ref={chartRef2}
                  option={buildChartOption(chartData, 'translation_y', 'translation_y', '#52c41a')}
                  style={{ height: 320 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Card>
            </Col>

            <Col xs={24} md={12} className="dashboard-col">
              <Card title="Zeta Chart" className="chart-card dashboard-card">
                <ReactECharts
                  ref={chartRef3}
                  option={buildChartOption(chartData, 'zeta', 'zeta', '#fa8c16')}
                  style={{ height: 320 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Card>
            </Col>

            <Col xs={24} md={12} className="dashboard-col">
              <Card title="Export CSV" className="chart-card dashboard-card export-main-card">
                <div className="export-modern">
                  <div className="export-section export-section-start">
                    <div className="export-section-title">From</div>
                    <div className="export-date-grid">
                      <div className="export-date-box">
                        <div className="export-box-label">Date</div>
                        <DatePicker
                          value={fromDate}
                          onChange={(value) => setFromDate(value)}
                          className="export-date"
                          format="DD MMM YYYY"
                        />
                      </div>

                      <div className="export-date-box">
                        <div className="export-box-label">Time</div>
                        <TimePicker
                          value={fromTime}
                          onChange={(value) => setFromTime(value)}
                          className="export-time"
                          format="HH:mm:ss"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="export-duration-box">
                    Duration: {
                      (combineDateTime(toDate, toTime) && combineDateTime(fromDate, fromTime))
                        ? `${combineDateTime(toDate, toTime).diff(combineDateTime(fromDate, fromTime), 'day')} Days ${combineDateTime(toDate, toTime).diff(combineDateTime(fromDate, fromTime), 'hour') % 24} Hours`
                        : '-'
                    }
                  </div>

                  <div className="export-section export-section-end">
                    <div className="export-section-title">To</div>
                    <div className="export-date-grid">
                      <div className="export-date-box">
                        <div className="export-box-label">Date</div>
                        <DatePicker
                          value={toDate}
                          onChange={(value) => setToDate(value)}
                          className="export-date"
                          format="DD MMM YYYY"
                        />
                      </div>

                      <div className="export-date-box">
                        <div className="export-box-label">Time</div>
                        <TimePicker
                          value={toTime}
                          onChange={(value) => setToTime(value)}
                          className="export-time"
                          format="HH:mm:ss"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadCSV}
                    loading={exportLoading}
                    className="export-download-btn-modern"
                    block
                  >
                    Download
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  )
}

export default DashboardPage