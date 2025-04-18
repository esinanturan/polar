'use client'

import MeterFilterInput from '@/components/Meter/MeterFilterInput'
import { enums, schemas } from '@polar-sh/client'
import Input from '@polar-sh/ui/components/atoms/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@polar-sh/ui/components/atoms/Select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@polar-sh/ui/components/ui/form'
import { useFormContext } from 'react-hook-form'

const AGGREGATION_FUNCTIONS = [
  ...enums.countAggregationFuncValues,
  ...enums.propertyAggregationFuncValues,
]

const AGGREGATION_FUNCTION_DISPLAY_NAMES: Record<
  (typeof AGGREGATION_FUNCTIONS)[number],
  string
> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
}

const MeterForm = ({ eventNames }: { eventNames?: schemas['EventName'][] }) => {
  const form = useFormContext<schemas['MeterCreate']>()
  const { control, watch } = form
  const aggregationFunction = watch('aggregation.func')

  return (
    <>
      <FormField
        control={control}
        name="name"
        rules={{
          minLength: {
            value: 3,
            message: 'This field must be at least 3 characters long',
          },
          required: 'This field is required',
        }}
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormDescription>
                Will be shown on customer&apos;s invoices and usage.
              </FormDescription>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormItem>
        <FormLabel>Filters</FormLabel>
        <FormDescription>
          Specify how events are filtered before they are aggregated.
        </FormDescription>
        <MeterFilterInput eventNames={eventNames} prefix="filter" />
        <FormMessage />
      </FormItem>
      <FormItem>
        <FormLabel>Aggregation</FormLabel>
        <FormDescription>
          The function that will turn the filtered events into a unit values.
        </FormDescription>
        <div className="flex flex-row items-center gap-x-4">
          <FormField
            control={control}
            name="aggregation.func"
            rules={{
              required: 'This field is required',
            }}
            render={({ field }) => {
              return (
                <FormItem className="flex-1">
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select aggregation function" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGGREGATION_FUNCTION_DISPLAY_NAMES).map(
                        ([func, displayName]) => (
                          <SelectItem key={func} value={func}>
                            {displayName}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )
            }}
          />
          {aggregationFunction !== 'count' && (
            <FormField
              control={control}
              name="aggregation.property"
              rules={{
                required: 'This field is required',
              }}
              render={({ field }) => {
                return (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Over property"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          )}
        </div>
      </FormItem>
    </>
  )
}

export default MeterForm
