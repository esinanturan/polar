'use client'

import { BenefitGrant } from '@/components/Benefit/BenefitGrant'
import {
  useCustomerBenefitGrants,
  useCustomerOrderInvoice,
} from '@/hooks/queries'
import { Client, schemas } from '@polar-sh/client'
import Button from '@polar-sh/ui/components/atoms/Button'
import { List, ListItem } from '@polar-sh/ui/components/atoms/List'
import { ThemingPresetProps } from '@polar-sh/ui/hooks/theming'
import { formatCurrencyAndAmount } from '@polar-sh/ui/lib/money'
import { useCallback } from 'react'

const CustomerPortalOrder = ({
  api,
  order,
  themingPreset,
}: {
  api: Client
  order: schemas['CustomerOrder']
  themingPreset: ThemingPresetProps
}) => {
  const { data: benefitGrants } = useCustomerBenefitGrants(api, {
    order_id: order.id,
    limit: 100,
    sorting: ['type'],
  })

  const orderInvoiceMutation = useCustomerOrderInvoice(api)
  const openInvoice = useCallback(async () => {
    const { url } = await orderInvoiceMutation.mutateAsync({ id: order.id })
    window.open(url, '_blank')
  }, [orderInvoiceMutation, order])

  return (
    <>
      <div className="flex h-full flex-col gap-12">
        <div className="flex w-full flex-col gap-8">
          <h3 className="text-2xl">{order.product.name}</h3>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-light">
                {formatCurrencyAndAmount(order.total_amount, order.currency, 0)}
              </h1>
              <p className="dark:text-polar-500 text-sm text-gray-400">
                Purchased on{' '}
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                fullWidth
                onClick={openInvoice}
                loading={orderInvoiceMutation.isPending}
                disabled={orderInvoiceMutation.isPending}
                className={themingPreset.polar.button}
              >
                Download Invoice
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4">
            <h3 className="text-lg">Benefit Grants</h3>
            {(benefitGrants?.items.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4">
                <List className={themingPreset.polar.list}>
                  {benefitGrants?.items.map((benefitGrant) => (
                    <ListItem
                      key={benefitGrant.id}
                      className="py-6 hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <BenefitGrant api={api} benefitGrant={benefitGrant} />
                    </ListItem>
                  ))}
                </List>
              </div>
            ) : (
              <div className="dark:border-polar-700 flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 p-6">
                <span className="dark:text-polar-500 text-gray-500">
                  This product has no benefit grants
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CustomerPortalOrder
