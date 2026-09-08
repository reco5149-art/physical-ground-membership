import { SignupForm } from './signup-form'

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-1 text-base font-bold text-gray-900">회원가입</h2>
      <p className="mb-5 text-sm text-gray-500">
        피지컬그라운드 직원 계정을 만듭니다.
      </p>
      <SignupForm />
    </>
  )
}
