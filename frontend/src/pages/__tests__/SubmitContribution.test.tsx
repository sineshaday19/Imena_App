import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import SubmitContribution from '../SubmitContribution'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: '',
      phone_number: '0123456789',
      role: 'RIDER',
      is_member_verified: true,
    },
    loading: false,
    refreshUser: vi.fn(),
  }),
}))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getCooperatives: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Coop' }]),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

describe('SubmitContribution', () => {
  it('renders contribution form', async () => {
    render(
      <MemoryRouter>
        <SubmitContribution />
      </MemoryRouter>
    )
    await screen.findByText('submitContribution.subtitle')
    expect(screen.getByText('submitContribution.pageTitle')).toBeInTheDocument()
  })
})
