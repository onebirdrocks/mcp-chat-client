import type { JSONSchema7 as JSONSchema } from 'json-schema';

export const EMPTY_OBJECT: JSONSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

const isObjectRoot = (s?: JSONSchema | null) =>
  !!s &&
  (s.type === 'object' ||
    (Array.isArray(s.type) && s.type.includes('object')) ||
    (s.type == null && s.properties && typeof s.properties === 'object'));

const wrapAsValueObject = (schema: JSONSchema): JSONSchema => ({
  type: 'object',
  properties: { value: schema },
  required: ['value'],
  additionalProperties: false,
});

export function normalizeToObjectSchema(input?: JSONSchema | null): JSONSchema {
  if (!input || Object.keys(input).length === 0) return { ...EMPTY_OBJECT };
  if (isObjectRoot(input)) {
    if (!('additionalProperties' in input)) (input as any).additionalProperties = false;
    (input as any).required = Array.from(new Set((input as any).required || []));
    return input;
  }
  return wrapAsValueObject(input);
}
