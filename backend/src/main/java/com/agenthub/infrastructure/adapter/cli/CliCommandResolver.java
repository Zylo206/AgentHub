package com.agenthub.infrastructure.adapter.cli;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class CliCommandResolver {

    private CliCommandResolver() {
    }

    public static ResolvedCommand resolve(String command) {
        String normalized = normalize(command);
        if (normalized.isBlank()) {
            return ResolvedCommand.unavailable("CLI command is not configured.");
        }

        Path directPath = Path.of(normalized);
        if (directPath.isAbsolute() || normalized.contains("/") || normalized.contains("\\")) {
            return Files.isRegularFile(directPath)
                    ? ResolvedCommand.available(directPath.toString())
                    : ResolvedCommand.unavailable("CLI command path is not executable: " + normalized);
        }

        List<Path> candidates = candidatePaths(normalized);
        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                return ResolvedCommand.available(candidate.toString());
            }
        }

        String pathEnv = System.getenv("PATH");
        if (pathEnv == null || pathEnv.isBlank()) {
            return ResolvedCommand.unavailable("PATH environment variable is empty.");
        }
        return ResolvedCommand.unavailable("CLI command is not available on PATH: " + normalized);
    }

    public static String resolveExecutable(String command) {
        ResolvedCommand resolved = resolve(command);
        return resolved.available() ? resolved.executablePath() : normalize(command);
    }

    public static List<String> processCommand(String executable, List<String> args) {
        List<String> commandLine = new ArrayList<>();
        String normalized = normalize(executable);
        if (isWindows() && isWindowsShellScript(normalized)) {
            commandLine.add("cmd.exe");
            commandLine.add("/d");
            commandLine.add("/c");
        }
        commandLine.add(normalized);
        if (args != null) {
            commandLine.addAll(args);
        }
        return commandLine;
    }

    private static List<Path> candidatePaths(String commandName) {
        List<Path> candidatePaths = new ArrayList<>();
        List<String> names = commandCandidates(commandName);
        for (String directory : searchDirectories()) {
            for (String name : names) {
                candidatePaths.add(Path.of(directory, name));
            }
        }
        return candidatePaths;
    }

    private static List<String> commandCandidates(String commandName) {
        List<String> candidates = new ArrayList<>();
        if (isWindows() && !commandName.contains(".")) {
            candidates.add(commandName + ".cmd");
            candidates.add(commandName + ".CMD");
            candidates.add(commandName + ".exe");
            candidates.add(commandName + ".EXE");
            candidates.add(commandName + ".bat");
            candidates.add(commandName + ".BAT");
        }
        candidates.add(commandName);
        return candidates;
    }

    private static List<String> searchDirectories() {
        Set<String> preferred = new LinkedHashSet<>();
        Set<String> regularPath = new LinkedHashSet<>();
        Set<String> windowsApps = new LinkedHashSet<>();

        if (isWindows()) {
            addDirectory(preferred, System.getenv("APPDATA"), "npm");
            addDirectory(preferred, System.getenv("LOCALAPPDATA"), "Programs", "npm");
            addDirectory(preferred, System.getenv("ProgramFiles"), "nodejs");
        }

        String pathEnv = System.getenv("PATH");
        if (pathEnv != null && !pathEnv.isBlank()) {
            for (String rawEntry : pathEnv.split(java.io.File.pathSeparator)) {
                String entry = normalize(rawEntry);
                if (entry.isBlank()) {
                    continue;
                }
                if (entry.toLowerCase(Locale.ROOT).contains("\\windowsapps")) {
                    windowsApps.add(entry);
                } else {
                    regularPath.add(entry);
                }
            }
        }

        List<String> result = new ArrayList<>();
        result.addAll(preferred);
        result.addAll(regularPath);
        result.addAll(windowsApps);
        return result;
    }

    private static boolean isWindowsShellScript(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.endsWith(".cmd") || normalized.endsWith(".bat");
    }

    private static void addIfPresent(Set<String> values, String value) {
        String normalized = normalize(value);
        if (!normalized.isBlank()) {
            values.add(normalized);
        }
    }

    private static void addDirectory(Set<String> values, String root, String first, String... more) {
        String normalizedRoot = normalize(root);
        if (normalizedRoot.isBlank()) {
            return;
        }
        String[] segments = new String[more.length + 1];
        segments[0] = first;
        System.arraycopy(more, 0, segments, 1, more.length);
        values.add(Path.of(normalizedRoot, segments).toString());
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    public record ResolvedCommand(boolean available, String executablePath, String failureReason) {
        public static ResolvedCommand available(String executablePath) {
            return new ResolvedCommand(true, executablePath, null);
        }

        public static ResolvedCommand unavailable(String failureReason) {
            return new ResolvedCommand(false, null, failureReason);
        }
    }
}
