export interface VoiceSampleCommand {
  command_id: string;
  category: string;
  command_text: string;
  intent_code: string;
  action_type: "LOOKUP" | "NAVIGATION" | "UNKNOWN";
  action_target?: string | null;
  default_response: string;
  display_order: number;
}

export interface VoiceProcessRequest {
  transcript: string;
  session_source: "VOICE" | "SUGGESTION_CLICK";
  user_id?: string;
  current_lat?: number;
  current_lng?: number;
}

export interface VoiceProcessResponse {
  log_id: string;
  raw_transcript: string;
  normalized_text: string;
  detected_intent?: string | null;
  confidence_score: number;
  action_type: "LOOKUP" | "NAVIGATION" | "UNKNOWN";
  action_target?: string | null;
  action_payload?: Record<string, any> | null;
  response_text: string;
  is_success: boolean;
  sample_suggestions?: string[] | null;
  processing_time_ms: number;
}

export type VoiceAssistantScreen = "HOME" | "LISTENING" | "RESULT";
