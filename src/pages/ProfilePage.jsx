import { useEffect, useRef, useState } from 'react'
import { Layout, Typography, Card, Button, Modal, Form, Input, Select, Tag, message } from 'antd'
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
  { key: 'password', title: 'Password', fieldType: 'password' },
]

function ProfilePage({ setIsLoggedIn }) {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [addUserForm] = Form.useForm()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    firstname: '',
    last_name: '',
    is_superuser: false,
  })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [addUserModalOpen, setAddUserModalOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)

  const isLoggingOutRef = useRef(false)

  const getTokenFromLoginResponse = () => {
    const raw = localStorage.getItem('login_response')
    const loginResponse = raw ? JSON.parse(raw) : {}
    return loginResponse?.token || localStorage.getItem('token')
  }

  const getUserIdFromLoginResponse = () => {
    const raw = localStorage.getItem('login_response')
    const loginResponse = raw ? JSON.parse(raw) : {}
    return loginResponse?.id || loginResponse?.user_detail?.id || null
  }

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

    const token = getTokenFromLoginResponse()

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
      localStorage.removeItem('login_response')
      setIsLoggedIn(false)
      message.success('Logged out')
      navigate('/', { replace: true })
    }
  }

  const handleOpenEdit = (fieldKey) => {
    setEditingField(fieldKey)
    form.setFieldsValue({
      value: fieldKey === 'password' ? '' : profileData[fieldKey],
      confirmPassword: '',
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      const nextValue = values.value

      setSavingEdit(true)

      if (editingField === 'password') {
        const token = getTokenFromLoginResponse()
        const userId = getUserIdFromLoginResponse()
        if (!token) {
          message.error('Token not found, please login again')
          return
        }

        if (!userId) {
          message.error('User ID not found from login response')
          return
        }

        const response = await axios.post(
          `/api-auth/updatepassword/${userId}/`,
          { pwd: nextValue },
          {
            headers: {
              'Content-type': 'application/json',
              Authorization: `Token ${token}`,
            },
          }
        )

        if (!response || response.status !== 200) {
          throw new Error(`API did not return HTTP 200 (received: ${response?.status ?? 'no response'})`)
        }

        message.success('เปลี่ยนรหัสผ่านสำเร็จ')
        setEditModalOpen(false)
        form.resetFields()
        return
      }

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
      const isValidationError = Array.isArray(error?.errorFields)
      if (isValidationError) {
        return
      }

      const reason =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        error?.message ||
        'Unknown error'

      message.error(`Update failed: ${reason}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleOpenAddUser = () => {
    addUserForm.resetFields()
    setAddUserModalOpen(true)
  }

  const handleCreateUser = async () => {
    try {
      const values = await addUserForm.validateFields()

      setCreatingUser(true)
      const response = await axios.post('/api-auth/signup/', {
        username: values.username,
        email: values.email,
        password: values.password,
      })

      if (!response || response.status !== 201) {
        throw new Error(`Unexpected response status: ${response?.status ?? 'no response'}`)
      }

      message.success('เพิ่มผู้ใช้งานสำเร็จ')
      setAddUserModalOpen(false)
      addUserForm.resetFields()
    } catch (error) {
      const isValidationError = Array.isArray(error?.errorFields)
      if (isValidationError) {
        return
      }

      const reason =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        error?.message ||
        'Unknown error'

      message.error(`เพิ่มผู้ใช้งานไม่สำเร็จ: ${reason}`)
    } finally {
      setCreatingUser(false)
    }
  }

  const renderValue = (key) => {
    if (key === 'is_superuser') {
      return profileData.is_superuser
        ? <Tag color="gold">Admin</Tag>
        : <Tag color="blue">User</Tag>
    }

    if (key === 'password') {
      return <Text className="profile-value">********</Text>
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

          <Card
            className="profile-widget"
            title={<span className="profile-widget-title">Profile Details</span>}
            extra={
              profileData.is_superuser ? (
                <Button className="profile-create-user-btn" onClick={handleOpenAddUser}>
                  Add User
                </Button>
              ) : null
            }
          >
            <div className="profile-field-list">
              {profileWidgetConfig.map((widget) => (
                <div key={widget.key} className="profile-field-row">
                  <div className="profile-field-meta">
                    <div className="profile-field-label">{widget.title}</div>
                    <div>{renderValue(widget.key)}</div>
                  </div>
                  {widget.key !== 'is_superuser' ? (
                    <Button
                      icon={<EditOutlined />}
                      className="profile-edit-btn"
                      onClick={() => handleOpenEdit(widget.key)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Modal
            title={`Edit ${activeWidget?.title || ''}`}
            open={editModalOpen}
            onCancel={() => setEditModalOpen(false)}
            onOk={handleSaveEdit}
            okText="Save"
            cancelText="Cancel"
            className="profile-edit-modal"
            confirmLoading={savingEdit}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="value"
                label={activeWidget?.title}
                rules={
                  editingField === 'is_superuser'
                    ? []
                    : editingField === 'password'
                      ? [
                        { required: true, message: 'Please enter Password' },
                        { min: 6, message: 'Password must be at least 6 characters' },
                        {
                          pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                          message: 'Password must contain both letters and numbers',
                        },
                      ]
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
                ) : editingField === 'password' ? (
                  <Input.Password placeholder="Enter new password" autoComplete="new-password" />
                ) : (
                  <Input placeholder={`Enter ${activeWidget?.title || 'value'}`} />
                )}
              </Form.Item>

              {editingField === 'password' ? (
                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={['value']}
                  rules={[
                    { required: true, message: 'Please confirm Password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('value') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('Confirm Password does not match Password'))
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Confirm new password" autoComplete="new-password" />
                </Form.Item>
              ) : null}
            </Form>
          </Modal>

          <Modal
            title="Add New User"
            open={addUserModalOpen}
            onCancel={() => setAddUserModalOpen(false)}
            onOk={handleCreateUser}
            okText="Create"
            cancelText="Cancel"
            confirmLoading={creatingUser}
            className="profile-edit-modal"
          >
            <Form form={addUserForm} layout="vertical">
              <Form.Item
                name="username"
                label="ชื่อผู้ใช้"
                rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
              >
                <Input placeholder="ชื่อผู้ใช้" autoComplete="username" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'กรุณากรอก Email' },
                  { type: 'email', message: 'รูปแบบ Email ไม่ถูกต้อง' },
                ]}
              >
                <Input placeholder="Email" autoComplete="email" />
              </Form.Item>

              <Form.Item
                name="password"
                label="รหัสผ่าน"
                rules={[
                  { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                  { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
                  {
                    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                    message: 'รหัสผ่านต้องมีตัวอักษรและตัวเลขผสมกัน',
                  },
                ]}
              >
                <Input.Password placeholder="รหัสผ่าน" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="ยืนยันรหัสผ่าน"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'กรุณายืนยันรหัสผ่าน' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="ยืนยันรหัสผ่าน" autoComplete="new-password" />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  )
}

export default ProfilePage
