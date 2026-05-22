import type { Agent } from "../agents/agentTypes";

export interface ParsedAgentMention {
  matchedAgent: Agent | null;
  cleanedContent: string;
  rawMention: string | null;
  error?: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function extractUnknownMention(rawInput: string): string {
  const trimmed = rawInput.trimStart();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const firstToken = withoutAt.split(/\s+/, 1)[0] || "";
  return `@${firstToken}`.trim();
}

export function parseLeadingAgentMention(input: string, agents: Agent[]): ParsedAgentMention {
  const trimmedStart = input.trimStart();
  if (!trimmedStart.startsWith("@")) {
    return {
      matchedAgent: null,
      cleanedContent: input,
      rawMention: null
    };
  }

  const withoutAt = trimmedStart.slice(1);
  const sortedAgents = [...agents]
    .filter((agent) => agent.name.trim())
    .sort((left, right) => right.name.trim().length - left.name.trim().length);

  for (const agent of sortedAgents) {
    const candidateName = agent.name.trim();
    const normalizedCandidate = normalize(candidateName);
    const normalizedInput = withoutAt.toLowerCase();

    if (!normalizedInput.startsWith(normalizedCandidate)) {
      continue;
    }

    const nextCharacter = withoutAt.charAt(candidateName.length);
    if (nextCharacter && !/\s/.test(nextCharacter)) {
      continue;
    }

    return {
      matchedAgent: agent,
      cleanedContent: withoutAt.slice(candidateName.length).trimStart(),
      rawMention: `@${candidateName}`
    };
  }

  const rawMention = extractUnknownMention(trimmedStart);
  return {
    matchedAgent: null,
    cleanedContent: input,
    rawMention,
    error: `未找到这个 Agent：${rawMention}`
  };
}
