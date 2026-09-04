import { z } from "zod";

import { STATUS_TYPES } from "@/server/types/pricing";

export const isoDateSchema = z.iso.date();

const MAX_RANGE_SPAN_MS = 365 * 24 * 60 * 60 * 1000;

export const dateRangeSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "startDate must not be after endDate",
    path: ["endDate"],
  })
  .refine(
    ({ startDate, endDate }) =>
      Date.parse(`${endDate}T00:00:00.000Z`) -
        Date.parse(`${startDate}T00:00:00.000Z`) <=
      MAX_RANGE_SPAN_MS,
    {
      message: "date range must not exceed 366 inclusive days",
      path: ["endDate"],
    }
  );

export const rangeInputSchema = dateRangeSchema.extend({
  statusType: z.enum(STATUS_TYPES),
  netPrice: z.number().int().positive(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const dailyPriceRangeSchema = rangeInputSchema.extend({
  propertyId: z.uuid(),
  confirmed: z.boolean(),
});

export const hotDealRangeSchema = dateRangeSchema.extend({
  netPrice: z.number().int().positive(),
  showBeforeDays: z.number().int().min(0).max(365),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const hotDealRangeInputSchema = hotDealRangeSchema.extend({
  propertyId: z.uuid(),
  confirmed: z.boolean(),
});

export const conflictCheckSchema = dateRangeSchema.extend({
  propertyId: z.uuid(),
});

export const deleteDailyPriceRangeSchema = dateRangeSchema.extend({
  propertyId: z.uuid(),
});

export type DailyPriceRangeInput = z.infer<typeof dailyPriceRangeSchema>;
export type HotDealRangeInput = z.infer<typeof hotDealRangeInputSchema>;
export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;
export type DeleteDailyPriceRangeInput = z.infer<
  typeof deleteDailyPriceRangeSchema
>;
