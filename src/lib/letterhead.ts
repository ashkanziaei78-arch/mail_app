import type { LetterheadField } from "@prisma/client";
import type { FieldDefinition } from "@/components/ui/dynamic-field";

/**
 * ردیف دیتابیس را به شکلی که کامپوننت‌ها می‌خواهند درمی‌آورد.
 * یک جا نوشته شده تا هر بار که ستونی به فیلدهای سربرگ اضافه می‌شود، لازم نباشد
 * چند صفحه را جداگانه به‌روز کرد.
 */
export function toFieldDefinition(field: LetterheadField): FieldDefinition {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    area: field.area,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    defaultValue: field.defaultValue,
    options: (field.optionsJson as string[] | null) ?? [],
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    fontFamily: field.fontFamily,
    fontSize: field.fontSize,
    fontWeight: field.fontWeight,
    color: field.color,
    align: field.align,
    lineHeight: field.lineHeight,
  };
}

/** کادرهای تازه روی هم نیفتند: هر فیلد جدید کمی پایین‌تر از قبلی می‌نشیند. */
export function nextBoxPosition(existingCount: number) {
  return { x: 8, y: Math.min(80, 12 + existingCount * 9), width: 40, height: 7 };
}
