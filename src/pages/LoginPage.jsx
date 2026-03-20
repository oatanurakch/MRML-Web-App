import { Card, Form, Input, Button, Typography, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import axios from 'axios'
import './LoginPage.css'

const { Title, Text } = Typography

function LoginPage({ setIsLoggedIn }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    const { username, password, remember } = values

    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const res = await axios.post('/api-auth/login/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const token = res.data?.token
      const userDetail = res.data?.user_detail

      if (!token) {
        message.error('Login failed: token not found')
        return
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user_detail', JSON.stringify(userDetail || {}))

      if (remember) {
        localStorage.setItem('remember_username', username)
      } else {
        localStorage.removeItem('remember_username')
      }

      setIsLoggedIn(true)
      message.success('Login success')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Login error:', error)

      if (error.response?.status === 400 || error.response?.status === 401) {
        message.error('Username or password is incorrect')
      } else {
        message.error('Unable to connect to server')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-v2">
      <div className="login-left">
        <img
          src="/logo.png"
          alt="Login Illustration"
          className="login-illustration"
        />
      </div>

      <div className="login-right">
        <div className="top-right-circle"></div>
        <Card className="login-card-v2" bordered={false}>
          <div className="login-header-v2">
            <Title level={1} className="login-title-v2">
              Hello!
            </Title>
            <Text className="login-subtitle-v2">
              Sign in to get started
            </Text>
          </div>

          <Form
            layout="vertical"
            onFinish={onFinish}
            className="login-form-v2"
            autoComplete='on'
            initialValues={{
              username: localStorage.getItem('remember_username') || '',
              remember: !!localStorage.getItem('remember_username'),
            }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter username' }]}
            >
              <Input
                size="large"
                placeholder="Username"
                prefix={<UserOutlined />}
                className="login-input-v2"
                autoComplete='username'
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password
                size="large"
                placeholder="Password"
                prefix={<LockOutlined />}
                className="login-input-v2"
                autoComplete='current-password'
              />
            </Form.Item>

            <Form.Item
              name="remember"
              valuePropName="checked"
              className="remember-row"
            >
              <Checkbox>Remember me</Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              className="login-button-v2"
            >
              Login
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage