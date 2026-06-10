import type { Agent } from "../agents/agentTypes";

export interface ParsedAgentMention {
  matchedAgent: Agent | null;
  matchedAgents: Agent[];
  cleanedContent: string;
  rawMention: string | null;
  rawMentions: string[];
  suggestedAgents?: Agent[];
  error?: string;
}

interface MentionAliasMatch {
  agent: Agent;
  alias: string;
  consumedLength: number;
  wordCount: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitWords(value: string): string[] {
  const normalized = normalize(value);
  return normalized ? normalized.split(" ") : [];
}

function buildLeadingAliases(value: string): string[] {
  const words = splitWords(value);
  const aliases: string[] = [];

  for (let index = words.length; index >= 1; index -= 1) {
    aliases.push(words.slice(0, index).join(" "));
  }

  return aliases;
}

function buildAgentMentionAliases(agent: Agent): string[] {
  const aliases = new Set<string>();

  const addAliases = (value?: string | null) => {
    buildLeadingAliases(value || "").forEach((alias) => aliases.add(alias));
  };

  addAliases(agent.name);
  addAliases(String(agent.role || "").replace(/[_-]+/g, " "));

  return [...aliases].filter(Boolean);
}

function tokenizeLeadingWords(input: string): Array<{ word: string; end: number }> {
  return Array.from(input.matchAll(/\S+/g)).map((match) => ({
    word: normalize(match[0]),
    end: (match.index || 0) + match[0].length
  }));
}

function extractUnknownMention(rawInput: string): string {
  const trimmed = rawInput.trimStart();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const tokens = withoutAt.match(/\S+/g) || [];
  const compact = tokens.slice(0, 2).join(" ").trim();
  return `@${compact || withoutAt.trim()}`.trim();
}

function compareMentionMatch(left: MentionAliasMatch, right: MentionAliasMatch): number {
  if (left.wordCount !== right.wordCount) {
    return right.wordCount - left.wordCount;
  }
  if (left.consumedLength !== right.consumedLength) {
    return right.consumedLength - left.consumedLength;
  }
  return right.agent.name.trim().length - left.agent.name.trim().length;
}

function matchAgentMentionAlias(input: string, agent: Agent): MentionAliasMatch | null {
  const leadingWords = tokenizeLeadingWords(input);
  if (leadingWords.length === 0) {
    return null;
  }

  const aliases = buildAgentMentionAliases(agent)
    .map((alias) => ({ alias, words: splitWords(alias) }))
    .sort((left, right) => right.words.length - left.words.length || right.alias.length - left.alias.length);

  for (const candidate of aliases) {
    if (leadingWords.length < candidate.words.length) {
      continue;
    }

    const matchesAllWords = candidate.words.every((word, index) => leadingWords[index]?.word === word);
    if (!matchesAllWords) {
      continue;
    }

    return {
      agent,
      alias: candidate.alias,
      consumedLength: leadingWords[candidate.words.length - 1].end,
      wordCount: candidate.words.length
    };
  }

  return null;
}

function getMentionSuggestions(rawInput: string, agents: Agent[], limit = 3): Agent[] {
  const query = normalize(rawInput.replace(/^@/, ""));
  if (!query) {
    return [...agents]
      .filter((agent) => agent.name.trim())
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, limit);
  }

  return [...agents]
    .filter((agent) => {
      const aliases = buildAgentMentionAliases(agent);
      return aliases.some((alias) => alias.startsWith(query) || alias.includes(query));
    })
    .sort((left, right) => {
      const leftAliases = buildAgentMentionAliases(left);
      const rightAliases = buildAgentMentionAliases(right);
      const leftStarts = leftAliases.some((alias) => alias.startsWith(query)) ? 0 : 1;
      const rightStarts = rightAliases.some((alias) => alias.startsWith(query)) ? 0 : 1;
      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

function buildUnknownAgentError(rawMention: string, suggestions: Agent[]): string {
  if (suggestions.length === 0) {
    return `未找到这个 Agent：${rawMention}`;
  }

  return `未找到这个 Agent：${rawMention}。试试 ${suggestions
    .map((agent) => `@${agent.name}`)
    .join(" / ")}`;
}

function buildAmbiguousAgentError(rawMention: string, matches: MentionAliasMatch[]): string {
  return `@Agent 不够明确：${rawMention}。请改用 ${matches
    .map((match) => `@${match.agent.name}`)
    .join(" / ")}`;
}

export function filterAgentsByMentionQuery(agents: Agent[], query: string): Agent[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [...agents].sort((left, right) => left.name.localeCompare(right.name));
  }

  return [...agents]
    .filter((agent) => {
      const aliases = buildAgentMentionAliases(agent);
      return aliases.some((alias) => alias.startsWith(normalizedQuery) || alias.includes(normalizedQuery));
    })
    .sort((left, right) => {
      const leftAliases = buildAgentMentionAliases(left);
      const rightAliases = buildAgentMentionAliases(right);
      const leftStarts = leftAliases.some((alias) => alias.startsWith(normalizedQuery)) ? 0 : 1;
      const rightStarts = rightAliases.some((alias) => alias.startsWith(normalizedQuery)) ? 0 : 1;
      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }
      return left.name.localeCompare(right.name);
    });
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
    const matches = sortedAgents
      .map((agent) => matchAgentMentionAlias(withoutAt, agent))
      .filter((match): match is MentionAliasMatch => Boolean(match))
      .sort(compareMentionMatch);

    if (matches.length === 0) {
      const rawMention = extractUnknownMention(remaining);
      const suggestedAgents = getMentionSuggestions(rawMention, sortedAgents);
      return {
        matchedAgent: null,
        matchedAgents,
        cleanedContent: input,
        rawMention,
        rawMentions,
        suggestedAgents,
        error: buildUnknownAgentError(rawMention, suggestedAgents)
      };
    }

    const bestMatch = matches[0];
    const ambiguousMatches = matches.filter(
      (match) =>
        match.wordCount === bestMatch.wordCount &&
        match.consumedLength === bestMatch.consumedLength &&
        normalize(match.alias) === normalize(bestMatch.alias)
    );

    if (ambiguousMatches.length > 1) {
      const rawMention = extractUnknownMention(remaining);
      return {
        matchedAgent: null,
        matchedAgents,
        cleanedContent: input,
        rawMention,
        rawMentions,
        suggestedAgents: ambiguousMatches.map((match) => match.agent),
        error: buildAmbiguousAgentError(rawMention, ambiguousMatches)
      };
    }

    matchedAgents.push(bestMatch.agent);
    rawMentions.push(`@${withoutAt.slice(0, bestMatch.consumedLength).trim()}`);
    remaining = withoutAt.slice(bestMatch.consumedLength).trimStart();
  }

  return {
    matchedAgent: matchedAgents[0] ?? null,
    matchedAgents,
    cleanedContent: remaining,
    rawMention: rawMentions[0] ?? null,
    rawMentions
  };
}
