use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

use crate::ai::provider::StreamEvent;
use crate::tools::definitions::ToolDefinition;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

/// Accumulated tool call collected from streaming deltas.
#[derive(Debug, Default)]
struct ToolCallAccum {
    id: String,
    name: String,
    arguments: String,
}

/// Streams AI chat via reqwest. Works with both OpenAI and Anthropic protocols.
/// Sends `StreamEvent` variants over the Tauri IPC channel.
#[tauri::command]
pub async fn stream_ai_chat(
    channel: Channel<StreamEvent>,
    state: tauri::State<'_, AppState>,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<AiMessage>,
    tools: Vec<ToolDefinition>,
    is_anthropic: bool,
    temperature: f64,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    if is_anthropic {
        stream_anthropic(&client, &channel, &state, &base_url, &api_key, &model, &messages, &tools, temperature).await
    } else {
        stream_openai(&client, &channel, &state, &base_url, &api_key, &model, &messages, &tools, temperature).await
    }
}

async fn stream_openai(
    client: &reqwest::Client,
    channel: &Channel<StreamEvent>,
    state: &AppState,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    tools: &[ToolDefinition],
    temperature: f64,
) -> Result<(), String> {
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages.iter().map(|m| serde_json::json!({ "role": m.role, "content": m.content })).collect::<Vec<_>>(),
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
    let mut tool_calls: std::collections::BTreeMap<u32, ToolCallAccum> = std::collections::BTreeMap::new();

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
                        let _ = channel.send(StreamEvent::TextDelta(content.to_string()));
                    }

                    // Tool call delta
                    if let Some(tc_array) = delta["tool_calls"].as_array() {
                        for tc in tc_array {
                            let idx = tc["index"].as_u64().unwrap_or(0) as u32;
                            let accum = tool_calls.entry(idx).or_default();

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
                }
            }
        }
    }

    let _ = channel.send(StreamEvent::Done);

    // Collect tool calls
    let valid_calls: Vec<_> = tool_calls.iter().filter(|(_, a)| !a.name.is_empty()).collect();
    if valid_calls.is_empty() {
        return Ok(());
    }

    // Send all ToolCallStarted events first
    for (_, accum) in &valid_calls {
        let _ = channel.send(StreamEvent::ToolCallStarted {
            id: accum.id.clone(),
            name: accum.name.clone(),
            arguments: accum.arguments.clone(),
        });
    }

    // Execute all tool calls in parallel
    let futures: Vec<_> = valid_calls
        .iter()
        .map(|(_, accum)| {
            let name = accum.name.clone();
            let id = accum.id.clone();
            let args: serde_json::Value =
                serde_json::from_str(&accum.arguments).unwrap_or(serde_json::Value::Null);
            async move {
                let result = crate::tools::executor::execute_tool(&name, args, state).await;
                (id, name, result)
            }
        })
        .collect();

    let results = futures_util::future::join_all(futures).await;

    // Send ToolCallCompleted events
    for (id, name, result) in results {
        let _ = channel.send(StreamEvent::ToolCallCompleted {
            id,
            name,
            result: result.content,
            success: result.success,
        });
    }

    Ok(())
}

async fn stream_anthropic(
    client: &reqwest::Client,
    channel: &Channel<StreamEvent>,
    state: &AppState,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    tools: &[ToolDefinition],
    temperature: f64,
) -> Result<(), String> {
    let system_msg = messages.iter().find(|m| m.role == "system");
    let conversation: Vec<_> = messages.iter().filter(|m| m.role != "system").collect();

    let mut body = serde_json::json!({
        "model": model,
        "max_tokens": 8192,
        "messages": conversation.iter().map(|m| serde_json::json!({ "role": m.role, "content": m.content })).collect::<Vec<_>>(),
        "stream": true,
        "temperature": temperature,
    });

    if let Some(sys) = system_msg {
        body["system"] = serde_json::json!(sys.content);
    }

    if !tools.is_empty() {
        body["tools"] = serde_json::to_value(tools).map_err(|e| format!("序列化工具失败: {}", e))?;
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
                        if let Some(text) = event["delta"]["text"].as_str() {
                            let _ = channel.send(StreamEvent::TextDelta(text.to_string()));
                        }
                    }
                    Some("error") => {
                        let msg = event["error"]["message"].as_str().unwrap_or("Unknown error");
                        return Err(msg.to_string());
                    }
                    _ => {}
                }
            }
        }
    }

    let _ = channel.send(StreamEvent::Done);
    Ok(())
}
