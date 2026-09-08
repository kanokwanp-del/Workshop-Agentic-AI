import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller } from '../types';
import { toGeminiSchema } from '../tool-schema';

interface GeminiPart { text?: string; functionCall?: { name: string; args?: unknown }; functionResponse?: { name: string; response: unknown } }

export async function runGeminiConversation(apiKey: string | undefined, model: string, messages: ChatMessage[], systemPrompt: string, tools: McpTool[] = [], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!apiKey?.trim()) return { reply: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาตั้งค่า secret ก่อนใช้งาน Gemini', toolTrace: [] };
  const contents: Array<{ role: string; parts: GeminiPart[] }> = [
    ...messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
  ];
  const toolTrace = [];
  for (let round = 0; round < 4; round += 1) {
    const body: Record<string, unknown> = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents };
    if (tools.length) body.tools = [{ functionDeclarations: tools.map((tool) => ({ name: `${tool.serverId}__${tool.name}`, description: tool.description, parameters: toGeminiSchema(tool.inputSchema) })) }];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `Gemini ตอบกลับผิดพลาด (${response.status}) กรุณาตรวจสอบ API key และ model`, toolTrace };
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((part) => part.functionCall?.name);
    if (!calls.length) return { reply: parts.map((part) => part.text ?? '').join('') || 'โมเดลไม่ส่งข้อความตอบกลับ', toolTrace };
    contents.push({ role: 'model', parts });
    for (const part of calls) {
      const call = part.functionCall!;
      let result: unknown;
      try { result = callTool ? await callTool(call.name, call.args ?? {}) : { error: 'ยังไม่มี tool ให้เรียกใช้' }; } catch (error) { result = { error: String(error) }; }
      toolTrace.push({ name: call.name, arguments: call.args, result });
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] });
    }
  }
  return { reply: 'การเรียกใช้เครื่องมือเกินจำนวนรอบที่กำหนด', toolTrace };
}