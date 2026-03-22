import * as Form from '@radix-ui/react-form'
import { startTransition, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useLoginMutation } from '../hooks/useLoginMutation'
import { useAuthStore } from '../store/authStore'

function getApiErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    'Dang nhap that bai. Vui long thu lai.'
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const loginMutation = useLoginMutation()
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')

  if (session) {
    return <Navigate to="/chat" replace />
  }

  function updateField(name, value) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    try {
      const payload = await loginMutation.mutateAsync({
        email: formValues.email.trim(),
        password: formValues.password,
      })

      setSession(payload)
      startTransition(() => {
        navigate('/chat', { replace: true })
      })
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    }
  }

  return (
    <main className="auth-layout">
      <section className="brand-panel">
        <p className="section-tag">OpenClaw Portal</p>
        <h1>Dang nhap vao khong gian chat noi bo da nhan dien dung vai tro.</h1>
        <p className="panel-copy">
          Backend xac thuc thong tin nhan vien, cap `user_access_token`, va tra ve
          Role/Department de frontend hien thi dung theo session.
        </p>

        <div className="signal-grid">
          <article className="signal-card">
            <span className="signal-label">Security Boundary</span>
            <strong>Frontend chi goi Backend</strong>
            <p>Khong co duong di truc tiep tu FE sang OpenClaw hay DB.</p>
          </article>

          <article className="signal-card">
            <span className="signal-label">Detected Context</span>
            <strong>Role + Department</strong>
            <p>Thong tin nhan dien duoc backend xac minh truoc khi vao dashboard.</p>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-copy">
            <p className="section-tag">Employee Sign In</p>
            <h2>Su dung tai khoan noi bo cua ban</h2>
            <p>
              Sau khi dang nhap thanh cong, he thong se chuyen huong sang chat
              dashboard va hien thi dung phong ban cung vai tro hien tai.
            </p>
          </div>

          <Form.Root className="auth-form" onSubmit={handleSubmit}>
            <Form.Field className="field-group" name="email">
              <div className="field-meta">
                <Form.Label>Email cong ty</Form.Label>
                <Form.Message match="valueMissing">Email la bat buoc.</Form.Message>
                <Form.Message match="typeMismatch">Email khong dung dinh dang.</Form.Message>
              </div>
              <Form.Control asChild>
                <input
                  className="field-control"
                  type="email"
                  name="email"
                  placeholder="you@openclaw.local"
                  autoComplete="email"
                  required
                  value={formValues.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </Form.Control>
            </Form.Field>

            <Form.Field className="field-group" name="password">
              <div className="field-meta">
                <Form.Label>Mat khau</Form.Label>
                <Form.Message match="valueMissing">Mat khau la bat buoc.</Form.Message>
              </div>
              <Form.Control asChild>
                <input
                  className="field-control"
                  type="password"
                  name="password"
                  placeholder="Nhap mat khau noi bo"
                  autoComplete="current-password"
                  required
                  value={formValues.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
              </Form.Control>
            </Form.Field>

            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

            <Form.Submit asChild>
              <button
                className="submit-button"
                type="submit"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Dang dang nhap...' : 'Dang nhap'}
              </button>
            </Form.Submit>
          </Form.Root>
        </div>
      </section>
    </main>
  )
}
