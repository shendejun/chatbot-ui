import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

type ModelListItem = {
  id: string
  name: string
  provider: string
  model_id: string
  context_length: number | null
}

function isAuthorized(request: Request) {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    request.headers.get("x-api-token") ||
    request.headers.get("X-Api-Token")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader

  if (!process.env.CHAT_API_TOKEN) return false
  return token === process.env.CHAT_API_TOKEN
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401
    })
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: customModels } = await supabaseAdmin
      .from("models")
      .select("id, name, model_id, context_length")

    const builtin = LLM_LIST.map(model => ({
      id: model.modelId,
      name: model.modelName,
      provider: model.provider,
      model_id: model.modelId,
      context_length:
        "maxContext" in model ? (model as any).maxContext ?? null : null
    })) as ModelListItem[]

    const custom = (customModels ?? []).map(model => ({
      id: model.id,
      name: model.name,
      provider: "custom",
      model_id: model.model_id,
      context_length: model.context_length ?? null
    })) as ModelListItem[]

    return new Response(JSON.stringify([...custom, ...builtin]), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
