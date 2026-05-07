use serde::Deserialize;
use tauri::ipc::Channel;

#[derive(Debug, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

/// Streams AI chat via reqwest (no CORS). Works with both OpenAI and Anthropic protocols.
#[tauri::command]
pub async fn stream_ai_chat(
    channel: Channel<String>,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<AiMessage>,
    is_anthropic: bool,
    temperature: f64,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    if is_anthropic {
        stream_anthropic(&client, &channel, &base_url, &api_key, &model, &messages, temperature).await
    } else {
        stream_openai(&client, &channel, &base_url, &api_key, &model, &messages, temperature).await
    }
}

async fn stream_openai(
    client: &reqwest::Client,
    channel: &Channel<String>,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    temperature: f64,
) -> Result<(), String> {
    let body = serde_json::json!({
        "model": model,
        "messages": messages.iter().map(|m| serde_json::json!({ "role": m.role, "content": m.content })).collect::<Vec<_>>(),
        "stream": true,
        "temperature": temperature,
    });

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
                    if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
                        let _ = channel.send(delta.to_string());
                    }
                }
            }
        }
    }

    let _ = channel.send("__DONE__".to_string());
    Ok(())
}

async fn stream_anthropic(
    client: &reqwest::Client,
    channel: &Channel<String>,
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
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
                            let _ = channel.send(text.to_string());
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

    let _ = channel.send("__DONE__".to_string());
    Ok(())
}
