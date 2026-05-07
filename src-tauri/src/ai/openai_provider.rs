use async_trait::async_trait;
use crate::ai::provider::{AiProvider, ChatMessage, StreamEvent};
use crate::tools::definitions::ToolDefinition;

pub struct OpenAiProvider {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

#[async_trait]
impl AiProvider for OpenAiProvider {
    async fn chat_stream(
        &self,
        messages: &[ChatMessage],
        tools: &[ToolDefinition],
        on_event: &(dyn Fn(StreamEvent) + Send + Sync),
    ) -> Result<(), String> {
        let client = reqwest::Client::new();
        let mut body = serde_json::json!({
            "model": self.model,
            "messages": messages.iter().map(|m| serde_json::json!({ "role": m.role, "content": m.content })).collect::<Vec<_>>(),
            "stream": true,
        });

        if !tools.is_empty() {
            body["tools"] = serde_json::to_value(tools).map_err(|e| e.to_string())?;
        }

        let resp = client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, text));
        }

        let mut full_text = String::new();
        use futures_util::StreamExt;
        let mut stream = resp.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                let line = line.trim();
                if line.is_empty() || line == "data: [DONE]" { continue; }
                if let Some(data) = line.strip_prefix("data: ") {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(choices) = parsed["choices"].as_array() {
                            if let Some(choice) = choices.first() {
                                if let Some(delta) = choice["delta"]["content"].as_str() {
                                    full_text.push_str(delta);
                                    on_event(StreamEvent::TextDelta(delta.to_string()));
                                }
                            }
                        }
                    }
                }
            }
        }

        on_event(StreamEvent::Done);
        Ok(())
    }
}
