import { useEffect, useRef, useState } from 'react'
import { Layout, Typography, Card, Table, Button, Alert, Spin, message, Modal, Form, Select, Row, Col } from 'antd'
import { ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sidebar } from '../components/Sidebar'
import './NodePage.css'

const { Content } = Layout
const { Title, Text } = Typography

const dropdownConfigs = [
  {
    field: 'strengthIntactRock',
    label: 'Strength of intact rock material',
    options: ['< 1', '1.0 - 5.0', '5.0 - 25.0', '25.0 - 50.0', '50.0 - 100.0', '100.0 - 250.0', '> 250.0'],
    responseKeys: ['strength', 'strength_of_intact_rock_material', 'strengthIntactRock'],
  },
  {
    field: 'rockQualityDesignation',
    label: 'Rock Quality Designation (RQD)',
    options: ['< 25%', '25 - 50%', '50 - 75%', '75 - 90%', '90 - 100%'],
    responseKeys: ['rock_quality_designation', 'rqd', 'rockQualityDesignation'],
  },
  {
    field: 'spacingDiscontinuities',
    label: 'Spacing of discontinuities',
    options: ['< 60 mm', '60 - 200 mm', '200 - 600 mm', '600 - 2000 mm', '> 2000 mm'],
    responseKeys: ['spacing', 'spacing_of_discontinuities', 'spacingDiscontinuities'],
  },
  {
    field: 'discontinuitiesLengthPersistence',
    label: 'Discontinuities Length (Persistence)',
    options: ['> 20 m', '10 - 20 m', '3 - 10 m', '1 - 3 m', '< 1 m'],
    responseKeys: ['discontinuities_length', 'discontinuities_length_persistence', 'persistence', 'discontinuitiesLengthPersistence'],
  },
  {
    field: 'separationAperture',
    label: 'Separation (Aperture)',
    options: ['> 5 mm', '1.0 - 5.0 mm', '0.1 - 1.0 mm', '< 0.1 mm', 'None'],
    responseKeys: ['separation', 'separation_aperture', 'aperture', 'separationAperture'],
  },
  {
    field: 'roughness',
    label: 'Roughness',
    options: ['Slicken sided', 'Smooth', 'Slightly rough', 'Rough', 'Very rough'],
    responseKeys: ['roughness'],
  },
  {
    field: 'infilling',
    label: 'Infilling',
    options: ['Soft filing > 5 mm', 'Soft filing < 5 mm', 'Hard filing > 5 mm', 'Hard filing < 5 mm', 'None'],
    responseKeys: ['infilling'],
  },
  {
    field: 'weathering',
    label: 'Weathering',
    options: ['Decompressed', 'Highly weathered', 'Moderately weathered', 'Slightly weathered', 'Un-weathered'],
    responseKeys: ['weathering'],
  },
  {
    field: 'groundwaterInJoints',
    label: 'Groundwater in joints',
    options: ['Flowing', 'Dripping', 'Wet', 'Damp', 'Completely'],
    responseKeys: ['groundwater', 'groundwater_in_joints', 'groundwaterInJoints'],
  },
]

const normalizeText = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

function NodePage({ setIsLoggedIn }) {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nodeRecords, setNodeRecords] = useState([])
  const [errorText, setErrorText] = useState('')
  const [rmrModalOpen, setRmrModalOpen] = useState(false)
  const [rmrLoading, setRmrLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [rmrLocalDrafts, setRmrLocalDrafts] = useState({})

  const isLoggingOutRef = useRef(false)

  const extractRmrValue = (responseObj, config) => {
    if (!responseObj || typeof responseObj !== 'object') return undefined

    for (const key of config.responseKeys) {
      const directValue = responseObj[key]
      if (directValue !== undefined && directValue !== null && directValue !== '') {
        return directValue
      }
    }

    const expectedKeys = [...config.responseKeys, config.field, config.label].map(normalizeText)

    for (const [key, value] of Object.entries(responseObj)) {
      if (value === undefined || value === null || value === '') continue

      const normalizedKey = normalizeText(key)
      if (expectedKeys.includes(normalizedKey)) {
        return value
      }
    }

    return undefined
  }

  const getMappedRmrFormValues = (rawData) => {
    const source = Array.isArray(rawData) ? rawData[0] : rawData
    if (!source || typeof source !== 'object') return {}

    return dropdownConfigs.reduce((acc, config) => {
      const value = extractRmrValue(source, config)
      if (value !== undefined) {
        acc[config.field] = String(value)
      }
      return acc
    }, {})
  }

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

  const handleOpenRmrModal = async (record) => {
    if (!record?.id) {
      message.warning('Node ID is required for RMR/SMR editing')
      return
    }

    setSelectedNode(record)
    setRmrModalOpen(true)
    setRmrLoading(true)

    form.resetFields()

    const localDraft = rmrLocalDrafts[record.id]
    if (localDraft) {
      form.setFieldsValue(localDraft)
    }

    try {
      const response = await axios.get(`/api/node/rmr/${record.id}`)
      const mappedValues = getMappedRmrFormValues(response.data)
      form.setFieldsValue(mappedValues)
    } catch (error) {
      console.error('Fetch node RMR error:', error)
      message.error('Failed to load existing RMR/SMR values')
    } finally {
      setRmrLoading(false)
    }
  }

  const handleOpenSmrModal = (record) => {
    if (!record?.id) {
      message.warning('Node ID is required for SMR editing')
      return
    }

    message.info('SMR editor will be added in the next step')
  }

  const handleSaveRmrValues = async () => {
    try {
      if (!selectedNode?.id) {
        message.error('Node ID is required before saving')
        return
      }

      const values = await form.validateFields()

      const payload = {
        strength: values.strengthIntactRock,
        rqd: values.rockQualityDesignation,
        spacing: values.spacingDiscontinuities,
        discon_l: values.discontinuitiesLengthPersistence,
        seperated: values.separationAperture,
        roughness: values.roughness,
        infilling: values.infilling,
        weathering: values.weathering,
        groundwater: values.groundwaterInJoints,
      }

      setRmrLoading(true)
      const response = await axios.post(`/api/node/rmr/${selectedNode.id}/`, payload)

      if (response?.status !== 201) {
        throw new Error(`Unexpected response status: ${response?.status ?? 'unknown'}`)
      }

      setRmrLocalDrafts((prev) => ({
        ...prev,
        [selectedNode?.id]: values,
      }))

      message.success('บันทึก RMR สำเร็จ')
      setRmrModalOpen(false)
    } catch (error) {
      const isValidationError = Array.isArray(error?.errorFields)
      if (isValidationError) {
        return
      }

      const errorReason =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        error?.message ||
        'Unknown error'

      message.error(`บันทึก RMR ไม่สำเร็จ: ${errorReason}`)
    } finally {
      setRmrLoading(false)
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
    {
      title: 'Action',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <div className="node-action-group">
          <Button
            icon={<EditOutlined />}
            className="node-rmr-button"
            onClick={() => handleOpenRmrModal(record)}
          >
            RMR
          </Button>
          <Button
            icon={<EditOutlined />}
            className="node-smr-button"
            onClick={() => handleOpenSmrModal(record)}
          >
            SMR
          </Button>
        </div>
      ),
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
                scroll={{ x: 860 }}
              />
            </Spin>
          </Card>

          <Modal
            title={`RMR/SMR Edit${selectedNode?.node_sn ? ` - ${selectedNode.node_sn}` : ''}`}
            open={rmrModalOpen}
            onCancel={() => setRmrModalOpen(false)}
            onOk={handleSaveRmrValues}
            okText="Save"
            cancelText="Cancel"
            className="node-rmr-modal"
            width={860}
            confirmLoading={rmrLoading}
          >
            <Spin spinning={rmrLoading} tip="Loading current RMR/SMR values...">
              <Form form={form} layout="vertical" className="node-rmr-form">
                <Row gutter={[14, 8]}>
                  {dropdownConfigs.map((config) => (
                    <Col xs={24} md={12} key={config.field}>
                      <Form.Item label={config.label} name={config.field}>
                        <Select
                          placeholder={`Select ${config.label}`}
                          options={config.options.map((option) => ({ label: option, value: option }))}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                        />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              </Form>
            </Spin>
          </Modal>
        </div>
      </Content>
    </Layout>
  )
}

export default NodePage


