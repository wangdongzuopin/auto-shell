use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

use crate::ai::provider::StreamEvent;
use crate::tools::definitions::ToolDefinition;
use crate::AppState;

const MAX_TOOL_ITERATIONS: u32 = 20;
const MAX_CONVERSATION_TOKENS: usize = 12000;
const KEEP_RECENT_MESSAGES: usize = 6;

// ── Token estimation ────────────────────────────────────────────────

fn estimate_tokens(text: &str) -> usize {
    let chinese = text.chars().filter(|c| *c as u32 > 0x2000).count();
    let other = text.chars().count() - chinese;
    // Chinese: ~1 char per token; ASCII: ~4 chars per token
    chinese + (other / 4).max(1)
}

fn message_tokens(msg: &AiMessage) -> usize {
    estimate_tokens(&msg.content)
        + msg.tool_calls.as_ref().map_or(0, |tc| estimate_tokens(&tc.to_string()))
        + msg.tool_call_id.as_ref().map_or(0, |id| id.len() / 4)
}

fn total_tokens(messages: &[AiMessage]) -> usize {
    messages.iter().map(message_tokens).sum()
}

// ── Conversation compression ────────────────────────────────────────

fn compress_messages(messages: &mut Vec<AiMessage>) -> usize {
    let tokens = total_tokens(messages);
    if tokens <= MAX_CONVERSATION_TOKENS {
        return 0;
    }

    let system_idx = messages.iter().position(|m| m.role == "system");
    let non_system: Vec<usize> = messages
        .iter()
        .enumerate()
        .filter(|(_, m)| m.role != "system")
        .map(|(i, _)| i)
        .collect();

    if non_system.len() <= KEEP_RECENT_MESSAGES + 2 {
        return 0;
    }

    let keep_last = KEEP_RECENT_MESSAGES.min(non_system.len());
    let first_user_idx = non_system[0];
    let keep_start_idx = non_system[non_system.len() - keep_last];

    if first_user_idx + 1 >= keep_start_idx {
        return 0;
    }

    let dropped_count = non_system.len() - keep_last - 1;
    let summary = format!(
        "[对话历史已自动压缩] 省略了中间 {} 条消息以控制 token 消耗。如有需要，请基于最近的对话上下文继续回答。",
        dropped_count
    );

    // Rebuild: system (if present) + first user + summary + last N messages
    let mut rebuilt: Vec<AiMessage> = Vec::new();

    if let Some(sys_idx) = system_idx {
        if sys_idx < messages.len() {
            rebuilt.push(messages[sys_idx].clone());
        }
    }

    rebuilt.push(messages[first_user_idx].clone());
    rebuilt.push(AiMessage {
        role: "user".into(),
        content: summary,
        tool_call_id: None,
        tool_calls: None,
    });

    for i in keep_start_idx..messages.len() {
        rebuilt.push(messages[i].clone());
    }

    let new_tokens = total_tokens(&rebuilt);
    println!(
        "[pizz] Compressed conversation: {} → {} messages, ~{} → ~{} tokens",
        messages.len(),
        rebuilt.len(),
        tokens,
        new_tokens
    );

    *messages = rebuilt;
    dropped_count
}

// ── Types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<serde_json::Value>,
}

/// Accumulated tool call collected from streaming deltas.
#[derive(Debug, Default, Clone)]
struct ToolCallAccum {
    index: u32,
    id: String,
    name: String,
    arguments: String,
}

/// Result returned from a single streaming call.
#[derive(Debug)]
struct StreamResult {
    text_content: String,
    tool_calls: Vec<ToolCallAccum>,
}

// ── Main command ───────────────────────────────────────────────────

/// Streams AI chat with tool calling loop.
/// Sends `StreamEvent` variants over the Tauri IPC channel.
#[tauri::command]
pub async fn stream_ai_chat(
    channel: Channel<StreamEvent>,
    state: tauri::State<'_, AppState>,
    base_url: String,
    api_key: String,
    model: String,
    mut messages: Vec<AiMessage>,
    tools: Vec<ToolDefinition>,
    is_anthropic: bool,
    temperature: f64,
    conversation_id: Option<String>,
) -> Result<(), String> {
    let dropped = compress_messages(&mut messages);
    if dropped > 0 {
        let _ = channel.send(StreamEvent::ConversationCompressed {
            summary: format!("已压缩 {} 条历史消息，保留最近对话上下文。", dropped),
            dropped_count: dropped,
        });
    }

    let client = reqwest::Client::new();

    for _iteration in 0..MAX_TOOL_ITERATIONS {
        let result: StreamResult = if is_anthropic {
            stream_anthropic_once(
                &client, &channel, &base_url, &api_key, &model,
                &messages, &tools, temperature,
            )
            .await?
        } else {
            stream_openai_once(
                &client, &channel, &base_url, &api_key, &model,
                &messages, &tools, temperature,
            )
            .await?
        };

        // No tool calls → response is final
        if result.tool_calls.is_empty() {
            let _ = channel.send(StreamEvent::Done);
            return Ok(());
        }

        // Send started events
        for tc in &result.tool_calls {
            let _ = channel.send(StreamEvent::ToolCallStarted {
                id: tc.id.clone(),
                name: tc.name.clone(),
                arguments: tc.arguments.clone(),
            });
        }

        // Execute all tool calls in parallel
        let pool = state.pool.clone();
        let mcp = state.mcp_manager.clone();
        let term = state.terminal_manager.clone();
        let cid = conversation_id.clone();
        let futures: Vec<_> = result
            .tool_calls
            .iter()
            .map(|tc| {
                let name = tc.name.clone();
                let id = tc.id.clone();
                let args: serde_json::Value =
                    serde_json::from_str(&tc.arguments).unwrap_or(serde_json::Value::Null);
                let p = pool.clone();
                let m = mcp.clone();
                let t = term.clone();
                let conv_id = cid.clone();
                async move {
                    let tmp_state = AppState { pool: p, encryption_key: [0u8; 32], mcp_manager: m, terminal_manager: t };
                    let r = crate::tools::executor::execute_tool(&name, args, &tmp_state, conv_id).await;
                    (id, name, r)
                }
            })
            .collect();

        let tool_results = futures_util::future::join_all(futures).await;

        // Send completed events
        for (id, name, ref r) in &tool_results {
            let _ = channel.send(StreamEvent::ToolCallCompleted {
                id: id.clone(),
                name: name.clone(),
                result: r.content.clone(),
                success: r.success,
            });
        }

        // Build messages for next iteration
        push_tool_messages(&mut messages, &result, &tool_results, is_anthropic);
    }

    // Max iterations reached
    let _ = channel.send(StreamEvent::Done);
    Ok(())
}

// ── OpenAI streaming ───────────────────────────────────────────────

async fn stream_openai_once(
    client: &reqwest::Client,
    channel: &Channel<StreamEvent>,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    tools: &[ToolDefinition],
    temperature: f64,
) -> Result<StreamResult, String> {
    let messages_json: Vec<serde_json::Value> =
        messages.iter().map(build_openai_message).collect();

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages_json,
        "stream": true,
        "temperature": temperature,
    });

    if !tools.is_empty() {
        body["tools"] = serde_json::to_value(tools).map_err(|e| format!("序列化工具失败: {}", e))?;
    }

    let resp = client
        .post(format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API 错误 {}: {}", status, text));
    }

    use futures_util::StreamExt;
    let mut stream = resp.bytes_stream();
    let mut text_content = String::new();
    let mut tool_calls: std::collections::BTreeMap<u32, ToolCallAccum> =
        std::collections::BTreeMap::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("流错误: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() || line == "data: [DONE]" {
                continue;
            }
            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    let choice = &parsed["choices"][0];
                    let delta = &choice["delta"];

                    // Text delta
                    if let Some(content) = delta["content"].as_str() {
                        text_content.push_str(content);
                        let _ = channel.send(StreamEvent::TextDelta(content.to_string()));
                    }

                    // Tool call delta
                    if let Some(tc_array) = delta["tool_calls"].as_array() {
                        for tc in tc_array {
                            let idx = tc["index"].as_u64().unwrap_or(0) as u32;
                            let accum = tool_calls.entry(idx).or_default();
                            accum.index = idx;

                            if let Some(id) = tc["id"].as_str() {
                                accum.id = id.to_string();
                            }
                            if let Some(name) = tc["function"]["name"].as_str() {
                                accum.name = name.to_string();
                            }
                            if let Some(args) = tc["function"]["arguments"].as_str() {
                                accum.arguments.push_str(args);
                            }
                        }
                    }

                    // Finish reason: tool_calls — collect any remaining tool call data
                    if let Some(reason) = choice["finish_reason"].as_str() {
                        if reason == "tool_calls" {
                            // Tool calls are already accumulated from deltas
                        }
                    }
                }
            }
        }
    }

    // Return collected tool calls (sorted by index)
    let mut calls: Vec<ToolCallAccum> = tool_calls.into_values().collect();
    calls.sort_by_key(|c| c.index);

    Ok(StreamResult {
        text_content,
        tool_calls: calls,
    })
}

// ── Anthropic streaming ────────────────────────────────────────────

async fn stream_anthropic_once(
    client: &reqwest::Client,
    channel: &Channel<StreamEvent>,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    tools: &[ToolDefinition],
    temperature: f64,
) -> Result<StreamResult, String> {
    // Extract system prompt
    let system_msg = messages.iter().find(|m| m.role == "system");
    let conversation: Vec<serde_json::Value> = messages
        .iter()
        .filter(|m| m.role != "system")
        .map(build_anthropic_message)
        .collect();

    let mut body = serde_json::json!({
        "model": model,
        "max_tokens": 8192,
        "messages": conversation,
        "stream": true,
        "temperature": temperature,
    });

    // System prompt as cached content block (cache_control reduces cost ~90% on hit)
    if let Some(sys) = system_msg {
        body["system"] = serde_json::json!([{
            "type": "text",
            "text": sys.content,
            "cache_control": {"type": "ephemeral"}
        }]);
    }

    // Tools: cache_control on last tool definition marks entire tools array as cacheable
    if !tools.is_empty() {
        let mut tools_value = serde_json::to_value(tools).map_err(|e| format!("序列化工具失败: {}", e))?;
        if let Some(arr) = tools_value.as_array_mut() {
            if let Some(last) = arr.last_mut() {
                last["cache_control"] = serde_json::json!({"type": "ephemeral"});
            }
        }
        body["tools"] = tools_value;
    }

    // Add cache_control to last content block in the last message that isn't
    // the current query, so conversation history is cached across turns.
    // System + tools + history = 3 cache breakpoints (max 4, 1 reserved).
    if let Some(messages_arr) = body["messages"].as_array_mut() {
        let len = messages_arr.len();
        if len >= 2 {
            // Cache the content of the second-to-last message (stable history)
            let history_msg = &mut messages_arr[len - 2];
            if let Some(content) = history_msg["content"].as_array_mut() {
                if let Some(last_block) = content.last_mut() {
                    last_block["cache_control"] = serde_json::json!({"type": "ephemeral"});
                }
            } else if history_msg["content"].is_string() {
                // Wrap string content into array with cache
                let text = history_msg["content"].as_str().unwrap_or("").to_string();
                history_msg["content"] = serde_json::json!([{
                    "type": "text",
                    "text": text,
                    "cache_control": {"type": "ephemeral"}
                }]);
            }
        }
    }

    let resp = client
        .post(format!("{}/v1/messages", base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API 错误 {}: {}", status, text));
    }

    use futures_util::StreamExt;
    let mut stream = resp.bytes_stream();
    let mut text_content = String::new();
    let mut tool_calls: std::collections::BTreeMap<u32, ToolCallAccum> =
        std::collections::BTreeMap::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("流错误: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line = line.trim();
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                continue;
            }
            if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
                match event["type"].as_str() {
                    Some("content_block_delta") => {
                        let delta_type = event["delta"]["type"].as_str().unwrap_or("");
                        match delta_type {
                            "text_delta" => {
                                if let Some(t) = event["delta"]["text"].as_str() {
                                    text_content.push_str(t);
                                    let _ = channel.send(StreamEvent::TextDelta(t.to_string()));
                                }
                            }
                            "input_json_delta" => {
                                let idx = event["index"].as_u64().unwrap_or(0) as u32;
                                if let Some(partial) = event["delta"]["partial_json"].as_str() {
                                    tool_calls.entry(idx).or_default().arguments.push_str(partial);
                                }
                            }
                            _ => {}
                        }
                    }
                    Some("content_block_start") => {
                        let block = &event["content_block"];
                        if block["type"].as_str() == Some("tool_use") {
                            let idx = event["index"].as_u64().unwrap_or(0) as u32;
                            let accum = tool_calls.entry(idx).or_default();
                            accum.index = idx;
                            accum.id = block["id"].as_str().unwrap_or("").to_string();
                            accum.name = block["name"].as_str().unwrap_or("").to_string();
                        }
                    }
                    Some("error") => {
                        let msg = event["error"]["message"]
                            .as_str()
                            .unwrap_or("Unknown error");
                        return Err(msg.to_string());
                    }
                    _ => {}
                }
            }
        }
    }

    let mut calls: Vec<ToolCallAccum> = tool_calls.into_values().collect();
    calls.sort_by_key(|c| c.index);

    Ok(StreamResult {
        text_content,
        tool_calls: calls,
    })
}

// ── Message builders ───────────────────────────────────────────────

fn build_openai_message(msg: &AiMessage) -> serde_json::Value {
    let mut body = serde_json::json!({ "role": msg.role });

    // Tool messages have tool_call_id and no content key for null content
    if msg.role == "tool" {
        body["tool_call_id"] = serde_json::json!(msg.tool_call_id);
        body["content"] = serde_json::json!(msg.content);
    } else if let Some(ref tc) = msg.tool_calls {
        // Assistant message with tool calls
        body["tool_calls"] = tc.clone();
        body["content"] = serde_json::Value::Null;
    } else {
        body["content"] = serde_json::json!(msg.content);
    }

    body
}

fn build_anthropic_message(msg: &AiMessage) -> serde_json::Value {
    if msg.role == "tool" {
        // Tool result → user message with tool_result content block
        serde_json::json!({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": msg.tool_call_id,
                "content": msg.content
            }]
        })
    } else if msg.role == "assistant" && msg.content.starts_with('[') {
        // Assistant with content blocks (tool_use + text)
        if let Ok(blocks) =
            serde_json::from_str::<serde_json::Value>(&msg.content)
        {
            serde_json::json!({
                "role": "assistant",
                "content": blocks
            })
        } else {
            serde_json::json!({
                "role": msg.role,
                "content": msg.content
            })
        }
    } else {
        serde_json::json!({
            "role": msg.role,
            "content": msg.content
        })
    }
}

fn push_tool_messages(
    messages: &mut Vec<AiMessage>,
    result: &StreamResult,
    tool_results: &[(String, String, crate::tools::executor::ToolResult)],
    is_anthropic: bool,
) {
    if is_anthropic {
        // Assistant message: content blocks array (text + tool_use)
        let mut content_blocks: Vec<serde_json::Value> = Vec::new();
        if !result.text_content.is_empty() {
            content_blocks.push(serde_json::json!({
                "type": "text",
                "text": result.text_content
            }));
        }
        for tc in &result.tool_calls {
            let input: serde_json::Value =
                serde_json::from_str(&tc.arguments).unwrap_or(serde_json::Value::Null);
            content_blocks.push(serde_json::json!({
                "type": "tool_use",
                "id": tc.id,
                "name": tc.name,
                "input": input
            }));
        }
        let content_json = serde_json::to_string(&content_blocks).unwrap_or_default();
        messages.push(AiMessage {
            role: "assistant".into(),
            content: content_json,
            tool_call_id: None,
            tool_calls: None,
        });

        // Tool results: each as a user message with tool_result content blocks
        for (id, _name, r) in tool_results {
            messages.push(AiMessage {
                role: "tool".into(),
                content: r.content.clone(),
                tool_call_id: Some(id.clone()),
                tool_calls: None,
            });
        }
    } else {
        // OpenAI: assistant message with tool_calls
        let tc_json: Vec<serde_json::Value> = result
            .tool_calls
            .iter()
            .map(|tc| {
                serde_json::json!({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": tc.arguments
                    }
                })
            })
            .collect();

        messages.push(AiMessage {
            role: "assistant".into(),
            content: result.text_content.clone(),
            tool_call_id: None,
            tool_calls: Some(serde_json::Value::Array(tc_json)),
        });

        // Tool result messages
        for (id, _name, r) in tool_results {
            messages.push(AiMessage {
                role: "tool".into(),
                content: r.content.clone(),
                tool_call_id: Some(id.clone()),
                tool_calls: None,
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens_ascii() {
        let text = "Hello, this is a test message with about forty characters";
        let tokens = estimate_tokens(text);
        assert!(tokens > 5, "should estimate at least a few tokens");
        assert!(tokens < 100, "should not overestimate short text");
    }

    #[test]
    fn test_estimate_tokens_chinese() {
        let text = "这是一段中文测试文本用于验证token估算功能";
        let tokens = estimate_tokens(text);
        assert!(tokens > 10, "Chinese chars should count as ~1 token each");
        assert!(tokens <= text.chars().count(), "Chinese tokens should be <= char count");
    }

    #[test]
    fn test_total_tokens() {
        let messages = vec![
            AiMessage {
                role: "system".into(),
                content: "You are a helpful assistant.".into(),
                tool_call_id: None,
                tool_calls: None,
            },
            AiMessage {
                role: "user".into(),
                content: "你好，请帮我写一段代码。".into(),
                tool_call_id: None,
                tool_calls: None,
            },
        ];
        let tokens = total_tokens(&messages);
        assert!(tokens > 0, "should return positive token count");
    }

    #[test]
    fn test_compress_small_conversation_unchanged() {
        let messages = vec![
            AiMessage {
                role: "system".into(),
                content: "You are an assistant.".into(),
                tool_call_id: None,
                tool_calls: None,
            },
            AiMessage {
                role: "user".into(),
                content: "Hello".into(),
                tool_call_id: None,
                tool_calls: None,
            },
            AiMessage {
                role: "assistant".into(),
                content: "Hi!".into(),
                tool_call_id: None,
                tool_calls: None,
            },
        ];
        let mut msgs = messages.clone();
        compress_messages(&mut msgs);
        // Small conversation should not be compressed
        assert_eq!(msgs.len(), messages.len());
    }

    #[test]
    fn test_compress_large_conversation() {
        let mut messages = vec![AiMessage {
            role: "system".into(),
            content: "You are an assistant.".into(),
            tool_call_id: None,
            tool_calls: None,
        }];
        // Add first user message
        messages.push(AiMessage {
            role: "user".into(),
            content: "Initial question".into(),
            tool_call_id: None,
            tool_calls: None,
        });
        // Add many middle messages with padding to exceed token limit
        for i in 0..30 {
            let padding = "x".repeat(800); // ~200 tokens per message, 60 messages = ~12000
            messages.push(AiMessage {
                role: "user".into(),
                content: format!("Message {}: {}", i, padding),
                tool_call_id: None,
                tool_calls: None,
            });
            messages.push(AiMessage {
                role: "assistant".into(),
                content: format!("Response {}: {}", i, padding),
                tool_call_id: None,
                tool_calls: None,
            });
        }
        let original_len = messages.len();
        compress_messages(&mut messages);
        // Should be compressed: system + first user + summary + KEEP_RECENT_MESSAGES
        assert!(messages.len() < original_len, "large conversation should be compressed");
        assert_eq!(messages[0].role, "system", "first message should be system");
        assert_eq!(messages[1].role, "user", "second message should be initial user");
        assert!(
            messages[2].content.contains("对话历史已自动压缩"),
            "third message should be summary, got: {}",
            messages[2].content
        );
    }
}
