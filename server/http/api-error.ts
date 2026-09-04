export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

type ApiErrorOptions = {
  conflicts?: string[];
};

const defaultMessages: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "คำขอไม่ถูกต้อง",
  CONFLICT: "มีข้อมูลราคาพิเศษในช่วงวันที่เลือกอยู่แล้ว",
  NOT_FOUND: "ไม่พบบ้านพัก",
  INTERNAL_ERROR: "เกิดข้อผิดพลาดภายในระบบ",
};

export function apiError(
  code: ApiErrorCode,
  status: number,
  options: ApiErrorOptions = {}
): Response {
  return Response.json(
    {
      error: {
        code,
        message: defaultMessages[code],
      },
      ...(options.conflicts ? { conflicts: options.conflicts } : {}),
    },
    { status }
  );
}
