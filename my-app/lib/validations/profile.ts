import { z } from "zod";

/** Empty strings from form inputs mean "clear this field". */
const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const RESIDENCE_OPTIONS = ["DAY_SCHOLAR", "HOSTELLER"] as const;
export const RESIDENCE_LABELS: Record<(typeof RESIDENCE_OPTIONS)[number], string> = {
  DAY_SCHOLAR: "Day Scholar",
  HOSTELLER: "Hosteller",
};

export const profileUpdateSchema = z.object({
  sid: z.preprocess(
    blankToNull,
    z.string().trim().regex(/^\d{8}$/, "SID must be exactly 8 digits").nullable().optional(),
  ),
  phone: z.preprocess(
    (value) => {
      const v = blankToNull(value);
      // Accept "+91 98765-43210" style input; store the bare 10-digit number.
      return typeof v === "string" ? v.replace(/[\s-]/g, "").replace(/^(\+91|0)/, "") : v;
    },
    z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number").nullable().optional(),
  ),
  dateOfBirth: z.preprocess(
    blankToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be a valid date")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date of birth must be a valid date")
      .refine((v) => {
        const dob = new Date(v);
        const now = new Date();
        const minDob = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
        const maxDob = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        return dob >= minDob && dob <= maxDob;
      }, "Date of birth looks incorrect")
      .nullable()
      .optional(),
  ),
  residence: z.preprocess(blankToNull, z.enum(RESIDENCE_OPTIONS).nullable().optional()),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
