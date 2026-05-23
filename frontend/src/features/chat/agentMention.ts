import type { Agent } from "../agents/agentTypes";

export interface ParsedAgentMention {
  matchedAgent: Agent | null;
  matchedAgents: Agent[];
  cleanedContent: string;
  rawMention: string | null;
  rawMentions: string[];
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
      matchedAgents: [],
      cleanedContent: input,
      rawMention: null,
      rawMentions: []
    };
  }

  const sortedAgents = [...agents]
    .filter((agent) => agent.name.trim())
    .sort((left, right) => right.name.trim().length - left.name.trim().length);

  let remaining = trimmedStart;
  const matchedAgents: Agent[] = [];
  const rawMentions: string[] = [];

  while (remaining.startsWith("@")) {
    const withoutAt = remaining.slice(1);
    const matchedAgent = sortedAgents.find((agent) => {
      const candidateName = agent.name.trim();
      const normalizedCandidate = normalize(candidateName);
      const normalizedInput = withoutAt.toLowerCase();

      if (!normalizedInput.startsWith(normalizedCandidate)) {
        return false;
      }

      const nextCharacter = withoutAt.charAt(candidateName.length);
      return !nextCharacter || /\s/.test(nextCharacter);
    });

    if (!matchedAgent) {
      const rawMention = extractUnknownMention(remaining);
      return {
        matchedAgent: null,
        matchedAgents,
        cleanedContent: input,
        rawMention,
        rawMentions,
        error: `未找到这个 Agent：${rawMention}`
      };
    }

    const matchedName = matchedAgent.name.trim();
    matchedAgents.push(matchedAgent);
    rawMentions.push(`@${matchedName}`);
    remaining = withoutAt.slice(matchedName.length).trimStart();
  }

  return {
    matchedAgent: matchedAgents[0] ?? null,
    matchedAgents,
    cleanedContent: remaining,
    rawMention: rawMentions[0] ?? null,
    rawMentions
  };
}
