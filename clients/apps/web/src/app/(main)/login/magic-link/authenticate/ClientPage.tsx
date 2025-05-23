'use client'

import LogoIcon from '@/components/Brand/LogoIcon'
import { CONFIG } from '@/utils/config'
import Button from '@polar-sh/ui/components/atoms/Button'
import { useCallback, useState } from 'react'

const ClientPage = ({
  searchParams: { token, return_to },
}: {
  searchParams: { token: string; return_to?: string }
}) => {
  const urlSearchParams = new URLSearchParams({
    ...(return_to && { return_to }),
  })

  const [loading, setLoading] = useState(false)
  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    e.currentTarget.submit()
  }, [])

  return (
    <form
      className="dark:bg-polar-950 flex h-screen w-full grow items-center justify-center bg-gray-50"
      method="post"
      action={`${CONFIG.BASE_URL}/v1/magic_link/authenticate?${urlSearchParams.toString()}`}
      onSubmit={onSubmit}
    >
      <div id="polar-bg-gradient"></div>
      <div className="flex w-80 flex-col items-center gap-4">
        <LogoIcon size={60} className="mb-6 text-blue-500 dark:text-blue-400" />
        <div className="dark:text-polar-400 text-center text-gray-500">
          To complete the login verification process, please click the button
          below:
        </div>
        <input type="hidden" name="token" value={token} />
        <Button
          fullWidth
          size="lg"
          type="submit"
          loading={loading}
          disabled={loading}
        >
          Log in
        </Button>
      </div>
    </form>
  )
}

export default ClientPage
