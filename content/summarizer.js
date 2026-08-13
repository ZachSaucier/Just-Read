// Provider configurations: default endpoints and request/response adapters.
// Each entry has:
//   endpoint(model)  – returns the URL to POST to
//   buildHeaders(apiKey) – returns a Headers object
//   buildBody(model, prompt, content, temperature, rest) – returns the JSON body object
//   extractText(json) – pulls the summary string out of the response JSON
//   extractTokens(json) – pulls total token count (may be undefined for some providers)
const AI_PROVIDERS = {
  openai: {
    endpoint: () => "https://api.openai.com/v1/chat/completions",
    buildHeaders: (apiKey) => {
      const h = new Headers();
      h.append("Authorization", `Bearer ${apiKey}`);
      h.append("Content-Type", "application/json");
      return h;
    },
    buildBody: (model, prompt, content, temperature, rest) => ({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content },
      ],
      temperature,
      ...rest,
    }),
    extractText: (json) => json.choices[0].message.content,
    extractTokens: (json) => json.usage && json.usage.total_tokens,
  },

  anthropic: {
    endpoint: () => "https://api.anthropic.com/v1/messages",
    buildHeaders: (apiKey) => {
      const h = new Headers();
      h.append("x-api-key", apiKey);
      h.append("anthropic-version", "2023-06-01");
      h.append("anthropic-dangerous-direct-browser-access", "true");
      h.append("Content-Type", "application/json");
      return h;
    },
    buildBody: (model, prompt, content, temperature, rest) => ({
      model,
      system: prompt,
      messages: [{ role: "user", content }],
      max_tokens: 1024,
      temperature,
      ...rest,
    }),
    extractText: (json) => json.content[0].text,
    extractTokens: (json) =>
      json.usage && json.usage.input_tokens + json.usage.output_tokens,
  },

  gemini: {
    endpoint: (model, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    buildHeaders: () => {
      const h = new Headers();
      h.append("Content-Type", "application/json");
      return h;
    },
    buildBody: (model, prompt, content, temperature, rest) => ({
      system_instruction: { parts: [{ text: prompt }] },
      contents: [{ parts: [{ text: content }] }],
      generationConfig: { temperature, ...rest },
    }),
    extractText: (json) =>
      json.candidates[0].content.parts[0].text,
    extractTokens: (json) =>
      json.usageMetadata &&
      json.usageMetadata.totalTokenCount,
  },

  perplexity: {
    endpoint: () => "https://api.perplexity.ai/chat/completions",
    buildHeaders: (apiKey) => {
      const h = new Headers();
      h.append("Authorization", `Bearer ${apiKey}`);
      h.append("Content-Type", "application/json");
      return h;
    },
    buildBody: (model, prompt, content, temperature, rest) => ({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content },
      ],
      temperature,
      ...rest,
    }),
    extractText: (json) => json.choices[0].message.content,
    extractTokens: (json) => json.usage && json.usage.total_tokens,
  },

  // "custom" falls through to openai-compatible by default; users can also
  // set "requestFormat": "anthropic" to use the Anthropic request/response shape.
  custom: null, // resolved dynamically in handleSummarizeClick
};

const SUMMARIZER_PROVIDERS = ["openai", "anthropic", "gemini", "perplexity", "custom"];
const PLACEHOLDER_API_KEYS = [
  "YOUR_API_KEY_GOES_HERE",
  "YOUR_OPENAI_API_KEY_GOES_HERE",
];

// Migrate legacy config ({ key, baseUrl, ... }) to the new format.
// Returns a normalised options object with provider, apiKey, endpoint, etc.
function normalizeSummarizerOptions(raw) {
  const migrated = Object.assign({}, raw);

  if (typeof migrated.provider === "string" && migrated.provider !== "") {
    migrated.provider = migrated.provider.toLowerCase();
  } else {
    migrated.provider = "openai";
  }

  if (
    (typeof migrated.apiKey !== "string" || migrated.apiKey === "") &&
    migrated.key
  ) {
    migrated.apiKey = migrated.key;
  }
  delete migrated.key;

  if (
    (typeof migrated.endpoint !== "string" || migrated.endpoint === "") &&
    migrated.baseUrl
  ) {
    migrated.endpoint = migrated.baseUrl;
  }
  delete migrated.baseUrl;

  return migrated;
}

function handleSummarizeClick() {
    if (JR.summarizeBtn.disabled) return;
    JR.summarizeBtn.disabled = true;

    const userOptions = JR.chromeStorage["summarizer-options"];

    if (typeof userOptions === "undefined") {
      JR.summarizeBtn.disabled = false;
      return window.alert("To use the summarizer, add your AI provider API key to Just Read's options page. For more info, see https://justread.link/summarizer");
    }

    let rawOptions;
    try {
      rawOptions = JSON.parse(userOptions);
      if (typeof rawOptions !== "object" || rawOptions === null) {
        throw new Error("Invalid options");
      }
    } catch (e) {
      JR.summarizeBtn.disabled = false;
      return console.error("Summarizer options are invalid. See https://justread.link/summarizer for more info.");
    }

    const options = normalizeSummarizerOptions(rawOptions);

    const contentContainer =
      JR.readerDocument.querySelector(".content-container");
    if (contentContainer.querySelector(".simple-summary")) {
      contentContainer.removeChild(
        contentContainer.querySelector(".simple-summary")
      );
    }

    const {
      provider = "openai",
      apiKey,
      endpoint: customEndpoint,
      model: configModel,
      prompt: configPrompt,
      temperature: configTemperature,
      requestFormat,
      format: _legacyFormat,
      ...rest
    } = options;

    const content = contentContainer.innerText;

    if (SUMMARIZER_PROVIDERS.indexOf(provider) === -1) {
      JR.summarizeBtn.disabled = false;
      return console.error(
        `Unknown summarizer provider "${provider}". Supported: ${SUMMARIZER_PROVIDERS.join(", ")}.`
      );
    }

    // Validate API key
    if (typeof apiKey !== "string" || apiKey === "") {
      JR.summarizeBtn.disabled = false;
      return console.error("No API key was provided in the summarizer options.");
    }
    if (PLACEHOLDER_API_KEYS.indexOf(apiKey) !== -1) {
      JR.summarizeBtn.disabled = false;
      return console.error(
        "Placeholder API key detected. Replace it with your actual API key in Just Read's options page."
      );
    }
    if (content === "") {
      JR.summarizeBtn.disabled = false;
      return console.error("Missing content to summarize.");
    }

    const model = (typeof configModel === "string" && configModel !== "")
      ? configModel
      : provider === "anthropic" ? "claude-3-5-haiku-latest"
      : provider === "gemini"    ? "gemini-2.0-flash"
      : provider === "perplexity" ? "sonar"
      : "gpt-4o-mini";

    const prompt = (typeof configPrompt === "string" && configPrompt !== "")
      ? configPrompt
      : "Summarize the content you are provided as concisely as possible while retaining the key points.";

    const temperature = (typeof configTemperature !== "undefined" && configTemperature !== "")
      ? configTemperature
      : 0;

    // Resolve the provider adapter. "custom" uses openai-compatible format by
    // default, or anthropic format when requestFormat === "anthropic".
    let adapter;
    if (provider === "custom") {
      if (typeof customEndpoint !== "string" || customEndpoint === "") {
        JR.summarizeBtn.disabled = false;
        return console.error(
          'Custom provider requires an "endpoint" field in the summarizer options.'
        );
      }
      adapter =
        typeof requestFormat === "string" &&
        requestFormat.toLowerCase() === "anthropic"
          ? AI_PROVIDERS.anthropic
          : AI_PROVIDERS.openai;
    } else {
      adapter = AI_PROVIDERS[provider];
    }

    // Resolve the endpoint: custom overrides take precedence, then provider default.
    const endpoint = (typeof customEndpoint === "string" && customEndpoint !== "")
      ? customEndpoint
      : adapter.endpoint(model, apiKey);

    // Show loading indicator
    const summaryEl = document.createElement("div");
    summaryEl.className = "simple-summary";
    const summaryHeader = document.createElement("h3");
    summaryHeader.innerText = "Summary loading";
    summaryEl.appendChild(summaryHeader);
    contentContainer.prepend(summaryEl);

    fetch(endpoint, {
      method: "POST",
      headers: adapter.buildHeaders(apiKey),
      body: JSON.stringify(adapter.buildBody(model, prompt, content, temperature, rest)),
    })
      .then((response) => {
        const simpleSummaryContainer =
          contentContainer.querySelector(".simple-summary");
        const contentType = response.headers.get("content-type") || "";
        if (contentType.indexOf("text/html") !== -1) {
          return response.text().then(function (text) {
            const responseIframe = document.createElement("iframe");
            responseIframe.srcdoc = text;
            responseIframe.style.width = "100%";
            simpleSummaryContainer.parentElement.replaceChild(
              responseIframe,
              simpleSummaryContainer
            );
          });
        }

        return response.json().then(function (json) {
          // Surface API-level errors (OpenAI, Anthropic, Gemini all use an "error" field)
          const apiError = json.error || (json.promptFeedback && json.promptFeedback.blockReason);
          if (apiError) {
            const errorMsg = typeof apiError === "object" ? apiError.message : apiError;
            simpleSummaryContainer.innerHTML = DOMPurify.sanitize(
              `<h3>Error getting summary</h3><p>${errorMsg}</p>`
            );
            return;
          }

          let summaryText;
          try {
            summaryText = adapter.extractText(json);
          } catch (e) {
            simpleSummaryContainer.innerHTML = DOMPurify.sanitize(
              `<h3>Error getting summary</h3><p>Unexpected response format from the AI provider.</p>`
            );
            return;
          }

          const tokensUsed = adapter.extractTokens(json);
          const tokenLabel = tokensUsed != null ? `: ${tokensUsed} tokens used` : "";

          if (JR.chromeStorage["summaryReplace"]) {
            contentContainer.innerHTML = DOMPurify.sanitize(summaryText);
            if (tokensUsed != null) console.log(`Tokens used to create summary: ${tokensUsed}`);
          } else {
            simpleSummaryContainer.innerHTML = DOMPurify.sanitize(`
                <h3>Summary<span>${tokenLabel}</span></h3>
                <p>${summaryText}</p>
              `);
          }
        });
      })
      .catch(function (err) {
        console.error("Fetching summary error", err);
        const simpleSummaryContainer =
          contentContainer.querySelector(".simple-summary");
        if (simpleSummaryContainer) {
          simpleSummaryContainer.innerHTML = DOMPurify.sanitize(`
            <h3>Error getting summary</h3>
            <p>${err.message}</p>
          `);
        }
      })
      .finally(function () {
        JR.summarizeBtn.disabled = false;
      });
}
