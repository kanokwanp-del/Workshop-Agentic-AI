import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller } from '../types';

export async function runOpenAiCompatConversation(baseUrl: string | undefined, apiKey: string | undefined, model: string, messages: ChatMessage[], systemPrompt: string, tools: McpTool[] = [], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!baseUrl?.trim() || baseUrl.trim().toLowerCase() === 'replace base url') return { reply: 'ยังไม่ได้ตั้งค่า OPENAI_COMPAT_BASE_URL กรุณาตั้งค่า gateway URL ก่อนใช้งาน', toolTrace: [] };
  if (!apiKey?.trim()) return { reply: 'ยังไม่ได้ตั้งค่า API key ของ provider นี้ กรุณาตั้งค่า secret ก่อนใช้งาน', toolTrace: [] };
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const openMessages: Array<Record<string, unknown>> = [{ role: 'system', content: systemPrompt }, ...messages.map((message) => ({ role: message.role, content: message.content }))];
  const toolTrace = [];
  for (let round = 0; round < 4; round += 1) {
    const body: Record<string, unknown> = { model, messages: openMessages };
    if (tools.length) { body.tools = tools.map((tool) => ({ type: 'function', function: { name: `${tool.serverId}__${tool.name}`, description: tool.description, parameters: tool.inputSchema } })); body.tool_choice = 'auto'; }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `AI provider ตอบกลับผิดพลาด (${response.status}) กรุณาตรวจสอบการตั้งค่า`, toolTrace };
    const data = await response.json() as { choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
    const message = data.choices?.[0]?.message;
    if (!message) return { reply: 'AI provider ไม่ส่งข้อความตอบกลับ', toolTrace };
    if (!message.tool_calls?.length) return { reply: message.content || 'โมเดลไม่ส่งข้อความตอบกลับ', toolTrace };
    openMessages.push({ role: 'assistant', content: message.content ?? null, tool_calls: message.tool_calls });
    for (const toolCall of message.tool_calls) {
      let args: unknown = {}; try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { args = {}; }
      let result: unknown; try { result = callTool ? await callTool(toolCall.function.name, args) : { error: 'ยังไม่มี tool ให้เรียกใช้' }; } catch (error) { result = { error: String(error) }; }
      toolTrace.push({ name: toolCall.function.name, arguments: args, result });
      openMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
    }
  }
  return { reply: 'การเรียกใช้เครื่องมือเกินจำนวนรอบที่กำหนด', toolTrace };
}