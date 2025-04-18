import { schemas } from '@polar-sh/client'
import { useThemePreset } from '@polar-sh/ui/hooks/theming'
import { twMerge } from 'tailwind-merge'
import ProductPriceLabel from '../Products/ProductPriceLabel'
import AmountLabel from '../Shared/AmountLabel'

interface CurrentPeriodOverviewProps {
  subscription: schemas['CustomerSubscription']
}

export const CurrentPeriodOverview = ({
  subscription,
}: CurrentPeriodOverviewProps) => {
  const themePreset = useThemePreset(
    subscription.product.organization.slug === 'midday' ? 'midday' : 'polar',
  )

  if (subscription.status !== 'active') {
    return null
  }

  const basePrice = subscription.prices.find(
    (price) => price.amount_type === 'fixed',
  )

  const totalAmount = subscription.meters.reduce(
    (acc, meter) => acc + meter.amount,
    basePrice?.price_amount || 0,
  )

  return (
    <div
      className={twMerge(
        'dark:border-polar-700 flex flex-col gap-4 rounded-3xl border border-gray-200 p-8',
        themePreset.polar.wellSecondary,
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium">Current Period Overview</h4>
        <span className="text-sm text-gray-500">
          Next Invoice —{' '}
          {subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString(
                'en-US',
                {
                  dateStyle: 'medium',
                },
              )
            : 'N/A'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            {subscription.product.name}
          </span>
          <span className="font-medium">
            <ProductPriceLabel product={subscription.product} />
          </span>
        </div>

        {subscription.meters.length > 0 && (
          <>
            <span className="font-medium">Metered Charges</span>

            {subscription.meters.map((meter) => (
              <div key={meter.id} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {meter.meter.name}
                </span>
                <span className="font-medium">
                  <AmountLabel
                    amount={meter.amount}
                    currency={subscription.currency}
                    minimumFractionDigits={2}
                  />
                </span>
              </div>
            ))}
          </>
        )}

        <div className="dark:border-polar-700 mt-2 border-t border-gray-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Estimated Total</span>
            <span className="text-lg font-semibold">
              <AmountLabel
                amount={totalAmount}
                currency={subscription.currency}
              />
            </span>
          </div>

          {subscription.meters.length > 0 && (
            <p className="text-xs text-gray-500">
              Final charges may vary based on usage until the end of the billing
              period
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
