/** سیاست گذرواژه — در سرور اعمال می‌شود، نه فقط در فرم. */
const COMMON = new Set([
  "password", "12345678", "123456789", "1234567890", "qwerty123", "iran1234",
  "admin123", "admin1234", "password1", "password123", "11111111", "abcd1234",
  "123123123", "qwertyui", "welcome1", "letmein1", "p@ssw0rd", "passw0rd",
]);

export const PASSWORD_RULES = "حداقل ۱۰ کاراکتر، شامل حرف بزرگ، حرف کوچک و رقم.";

export function validatePassword(value: string, context: { email?: string; fullName?: string } = {}): string | null {
  if (value.length < 10) return "گذرواژه باید حداقل ۱۰ کاراکتر باشد.";
  if (value.length > 200) return "گذرواژه بیش از حد بلند است.";
  if (!/[a-z]/.test(value)) return "گذرواژه باید حداقل یک حرف کوچک انگلیسی داشته باشد.";
  if (!/[A-Z]/.test(value)) return "گذرواژه باید حداقل یک حرف بزرگ انگلیسی داشته باشد.";
  if (!/\d/.test(value)) return "گذرواژه باید حداقل یک رقم داشته باشد.";
  if (COMMON.has(value.toLowerCase())) return "این گذرواژه بسیار رایج است. گذرواژه دیگری انتخاب کنید.";

  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length > 3 && value.toLowerCase().includes(local)) {
    return "گذرواژه نباید شامل ایمیل شما باشد.";
  }
  for (const part of (context.fullName ?? "").split(/\s+/)) {
    if (part.length > 3 && value.toLowerCase().includes(part.toLowerCase())) {
      return "گذرواژه نباید شامل نام شما باشد.";
    }
  }
  return null;
}
