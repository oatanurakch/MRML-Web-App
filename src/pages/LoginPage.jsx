import { Card, Form, Input, Button, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import axios from 'axios'

const { Title } = Typography

function LoginPage({ setIsLoggedIn }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    const { username, password } = values

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
    <div className="login-page">
      <Card className="login-card">
        <Title level={2} style={{ textAlign: 'center' }}>
          Login
        </Title>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            Login
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage