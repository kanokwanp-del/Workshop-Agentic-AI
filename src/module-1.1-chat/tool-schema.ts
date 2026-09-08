const GEMINI_TYPES: Record<string, string> = {
  object: 'OBJECT', string: 'STRING', number: 'NUMBER', integer: 'INTEGER',
  boolean: 'BOOLEAN', array: 'ARRAY', null: 'NULL',
};

export function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...schema };
  if (typeof schema.type === 'string') output.type = GEMINI_TYPES[schema.type.toLowerCase()] ?? schema.type.toUpperCase();
  if (schema.properties && typeof schema.properties === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
      if (value && typeof value === 'object') properties[key] = toGeminiSchema(value as Record<string, unknown>);
    }
    output.properties = properties;
  }
  if (schema.items && typeof schema.items === 'object') output.items = toGeminiSchema(schema.items as Record<string, unknown>);
  return output;
}