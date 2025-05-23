import {
  ACCOUNT_STATUS_DISPLAY_NAMES,
  ACCOUNT_TYPE_DISPLAY_NAMES,
} from '@/utils/account'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@polar-sh/client'
import Button from '@polar-sh/ui/components/atoms/Button'
import { twMerge } from 'tailwind-merge'
import AccountAssociations from './AccountAssociations'

interface AccountsListProps {
  accounts: schemas['Account'][]
  returnPath: string
  pauseActions?: boolean
}

const AccountsList = ({
  accounts,
  returnPath,
  pauseActions,
}: AccountsListProps) => {
  return (
    <table className="-mx-4 w-full text-left">
      <thead className="dark:text-polar-500 text-gray-500">
        <tr className="text-sm">
          <th
            scope="col"
            className="relative isolate whitespace-nowrap px-4 py-3.5 pr-2 text-left font-normal"
          >
            Type
          </th>
          <th
            scope="col"
            className="relative isolate whitespace-nowrap px-4 py-3.5 pr-2 text-left font-normal"
          >
            Status
          </th>
          <th
            scope="col"
            className="relative isolate whitespace-nowrap px-4 py-3.5 pr-2 text-left font-normal"
          >
            Used by
          </th>
          <th
            scope="col"
            className="relative isolate whitespace-nowrap px-4 py-3.5 pr-2 font-normal"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <AccountListItem
            key={account.id}
            account={account}
            pauseActions={pauseActions}
            returnPath={returnPath}
          />
        ))}
      </tbody>
    </table>
  )
}

export default AccountsList

interface AccountListItemProps {
  account: schemas['Account']
  returnPath: string
  pauseActions?: boolean
}

const AccountListItem = ({
  account,
  returnPath,
  pauseActions,
}: AccountListItemProps) => {
  pauseActions = pauseActions === true
  const childClass = twMerge(
    'dark:group-hover:bg-polar-700 px-4 py-2 transition-colors group-hover:bg-blue-50 group-hover:text-gray-950 text-gray-700 dark:text-polar-200 group-hover:dark:text-white',
  )

  const isActive = account?.status === 'active'
  const isUnderReview = account?.status === 'under_review'

  const goToOnboarding = async () => {
    const link = await unwrap(
      api.POST('/v1/accounts/{id}/onboarding_link', {
        params: {
          path: {
            id: account.id,
          },
          query: {
            return_path: returnPath,
          },
        },
      }),
    )
    window.location.href = link.url
  }

  const goToDashboard = async () => {
    const link = await unwrap(
      api.POST('/v1/accounts/{id}/dashboard_link', {
        params: {
          path: {
            id: account.id,
          },
        },
      }),
    )
    window.location.href = link.url
  }

  return (
    <tr className="group text-sm">
      <td className={twMerge(childClass, 'rounded-l-xl')}>
        {ACCOUNT_TYPE_DISPLAY_NAMES[account.account_type]}
      </td>
      <td className={childClass}>
        {ACCOUNT_STATUS_DISPLAY_NAMES[account.status]}
      </td>
      <td className={childClass}>
        <AccountAssociations account={account} />
      </td>
      <td className={twMerge(childClass, 'rounded-r-xl uppercase')}>
        {!isActive && !isUnderReview && (
          <Button size="sm" onClick={goToOnboarding} disabled={pauseActions}>
            Continue setup
          </Button>
        )}
        {isActive && (
          <Button size="sm" onClick={goToDashboard}>
            Open dashboard
          </Button>
        )}
      </td>
    </tr>
  )
}
