import { Database, Tables } from "@/supabase/types"
import { VALID_ENV_KEYS } from "@/types/valid-keys"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getServerProfile() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  const profileWithKeys = addApiKeysToProfile(profile)

  return profileWithKeys
}

export async function getServerProfileFromRequest(request: Request) {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    request.headers.get("x-api-token") ||
    request.headers.get("X-Api-Token")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader

  if (process.env.CHAT_API_TOKEN && token === process.env.CHAT_API_TOKEN) {
    return buildProfileFromEnv()
  }

  return await getServerProfile()
}

function addApiKeysToProfile(profile: Tables<"profiles">) {
  const apiKeys = {
    [VALID_ENV_KEYS.OPENAI_API_KEY]: "openai_api_key",
    [VALID_ENV_KEYS.ANTHROPIC_API_KEY]: "anthropic_api_key",
    [VALID_ENV_KEYS.GOOGLE_GEMINI_API_KEY]: "google_gemini_api_key",
    [VALID_ENV_KEYS.MISTRAL_API_KEY]: "mistral_api_key",
    [VALID_ENV_KEYS.GROQ_API_KEY]: "groq_api_key",
    [VALID_ENV_KEYS.PERPLEXITY_API_KEY]: "perplexity_api_key",
    [VALID_ENV_KEYS.AZURE_OPENAI_API_KEY]: "azure_openai_api_key",
    [VALID_ENV_KEYS.OPENROUTER_API_KEY]: "openrouter_api_key",

    [VALID_ENV_KEYS.OPENAI_ORGANIZATION_ID]: "openai_organization_id",

    [VALID_ENV_KEYS.AZURE_OPENAI_ENDPOINT]: "azure_openai_endpoint",
    [VALID_ENV_KEYS.AZURE_GPT_35_TURBO_NAME]: "azure_openai_35_turbo_id",
    [VALID_ENV_KEYS.AZURE_GPT_45_VISION_NAME]: "azure_openai_45_vision_id",
    [VALID_ENV_KEYS.AZURE_GPT_45_TURBO_NAME]: "azure_openai_45_turbo_id",
    [VALID_ENV_KEYS.AZURE_EMBEDDINGS_NAME]: "azure_openai_embeddings_id"
  }

  for (const [envKey, profileKey] of Object.entries(apiKeys)) {
    if (process.env[envKey]) {
      ;(profile as any)[profileKey] = process.env[envKey]
    }
  }

  return profile
}

function buildProfileFromEnv() {
  const now = new Date().toISOString()
  const apiUserId = "api-user"

  const profile: Tables<"profiles"> = {
    id: apiUserId,
    user_id: apiUserId,
    username: "api",
    display_name: "API User",
    bio: "",
    profile_context: "",
    image_path: "",
    image_url: "",
    created_at: now,
    updated_at: null,
    has_onboarded: true,
    use_azure_openai: Boolean(process.env.AZURE_OPENAI_API_KEY),
    openai_api_key: process.env.OPENAI_API_KEY || null,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || null,
    google_gemini_api_key: process.env.GOOGLE_GEMINI_API_KEY || null,
    mistral_api_key: process.env.MISTRAL_API_KEY || null,
    groq_api_key: process.env.GROQ_API_KEY || null,
    perplexity_api_key: process.env.PERPLEXITY_API_KEY || null,
    openrouter_api_key: process.env.OPENROUTER_API_KEY || null,
    openai_organization_id: process.env.OPENAI_ORGANIZATION_ID || null,
    azure_openai_api_key: process.env.AZURE_OPENAI_API_KEY || null,
    azure_openai_endpoint: process.env.AZURE_OPENAI_ENDPOINT || null,
    azure_openai_35_turbo_id: process.env.AZURE_GPT_35_TURBO_NAME || null,
    azure_openai_45_vision_id: process.env.AZURE_GPT_45_VISION_NAME || null,
    azure_openai_45_turbo_id: process.env.AZURE_GPT_45_TURBO_NAME || null,
    azure_openai_embeddings_id: process.env.AZURE_EMBEDDINGS_NAME || null
  }

  return profile
}

export function checkApiKey(apiKey: string | null, keyName: string) {
  if (apiKey === null || apiKey === "") {
    throw new Error(`${keyName} API Key not found`)
  }
}
