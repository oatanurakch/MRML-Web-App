import { useEffect, useRef, useState } from 'react'
import { Layout, Typography, Card, Row, Col, Button, Modal, Form, Input, Select, Tag, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sidebar } from '../components/Sidebar'
import './ProfilePage.css'

const { Content } = Layout
const { Title, Text } = Typography

const profileWidgetConfig = [
  { key: 'username', title: 'Username', fieldType: 'text' },
  { key: 'firstname', title: 'Firstname', fieldType: 'text' },
  { key: 'last_name', title: 'Last Name', fieldType: 'text' },
  { key: 'is_superuser', title: 'Role', fieldType: 'boolean' },
]

function ProfilePage({ setIsLoggedIn }) {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    firstname: '',
    last_name: '',
    is_superuser: false,
  })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)

  const isLoggingOutRef = useRef(false)

  useEffect(() => {
    const raw = localStorage.getItem('user_detail')
    const userDetail = raw ? JSON.parse(raw) : {}

    setProfileData({
      username: userDetail?.username ?? '',
      firstname: userDetail?.firstname ?? userDetail?.first_name ?? '',
      last_name: userDetail?.last_name ?? '',
      is_superuser: Boolean(userDetail?.is_superuser),
    })
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

  const handleOpenEdit = (fieldKey) => {
    setEditingField(fieldKey)
    form.setFieldsValue({ value: profileData[fieldKey] })
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      const nextValue = values.value

      const updated = {
        ...profileData,
        [editingField]: nextValue,
      }

      setProfileData(updated)

      const existingRaw = localStorage.getItem('user_detail')
      const existing = existingRaw ? JSON.parse(existingRaw) : {}

      const userDetailUpdated = {
        ...existing,
        username: updated.username,
        firstname: updated.firstname,
        first_name: updated.firstname,
        last_name: updated.last_name,
        is_superuser: Boolean(updated.is_superuser),
      }

      localStorage.setItem('user_detail', JSON.stringify(userDetailUpdated))
      message.success('Profile updated')
      setEditModalOpen(false)
    } catch (error) {
      // antd form handles validation messages.
    }
  }

  const renderValue = (key) => {
    if (key === 'is_superuser') {
      return profileData.is_superuser
        ? <Tag color="gold">Admin</Tag>
        : <Tag color="blue">User</Tag>
    }

    return <Text className="profile-value">{profileData[key] || '-'}</Text>
  }

  const activeWidget = profileWidgetConfig.find((item) => item.key === editingField)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onLogout={handleLogout}
      />

      <Content>
        <div className="profile-page">
          <div className="profile-hero">
            <div className="profile-header-left">
              <img src="/logo.png" alt="MRML Logo" className="profile-logo" />
              <div>
                <Title level={2} className="profile-title">Profile</Title>
                <Text className="profile-subtitle">Profile summary from login session data</Text>
              </div>
            </div>
          </div>

          <Row gutter={[20, 20]}>
            {profileWidgetConfig.map((widget) => (
              <Col key={widget.key} xs={24} md={12}>
                <Card
                  className="profile-widget"
                  title={<span className="profile-widget-title">{widget.title}</span>}
                  extra={
                    <Button
                      icon={<EditOutlined />}
                      className="profile-edit-btn"
                      onClick={() => handleOpenEdit(widget.key)}
                    >
                      Edit
                    </Button>
                  }
                >
                  {renderValue(widget.key)}
                </Card>
              </Col>
            ))}
          </Row>

          <Modal
            title={`Edit ${activeWidget?.title || ''}`}
            open={editModalOpen}
            onCancel={() => setEditModalOpen(false)}
            onOk={handleSaveEdit}
            okText="Save"
            cancelText="Cancel"
            className="profile-edit-modal"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="value"
                label={activeWidget?.title}
                rules={
                  editingField === 'is_superuser'
                    ? []
                    : [{ required: true, message: `Please enter ${activeWidget?.title || 'value'}` }]
                }
              >
                {editingField === 'is_superuser' ? (
                  <Select
                    options={[
                      { label: 'Admin', value: true },
                      { label: 'User', value: false },
                    ]}
                  />
                ) : (
                  <Input placeholder={`Enter ${activeWidget?.title || 'value'}`} />
                )}
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  )
}

export default ProfilePage
