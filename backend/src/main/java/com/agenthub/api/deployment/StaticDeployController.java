package com.agenthub.api.deployment;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.deployment.DeploymentRecord;
import com.agenthub.domain.deployment.DeploymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves deployed artifact content as standalone HTML pages.
 * This endpoint is NOT under /api/** so it bypasses the auth interceptor,
 * making deployed previews publicly accessible.
 */
@RestController
public class StaticDeployController {

    private final DeploymentRepository deploymentRepository;
    private final ArtifactRepository artifactRepository;
    private final ObjectMapper objectMapper;

    public StaticDeployController(
            DeploymentRepository deploymentRepository,
            ArtifactRepository artifactRepository,
            ObjectMapper objectMapper) {
        this.deploymentRepository = deploymentRepository;
        this.artifactRepository = artifactRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/deploy/{deploymentId}")
    public void serveDeployedPage(
            @PathVariable("deploymentId") String deploymentId,
            HttpServletResponse response) {
        Optional<DeploymentRecord> recordOpt = deploymentRepository.findById(deploymentId);
        if (recordOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("text/html;charset=UTF-8");
            try {
                response.getWriter().write(buildErrorPage("404 - Deployment Not Found",
                        "No deployment record found for ID: " + escapeHtml(deploymentId)));
            } catch (Exception ignored) {
                // best-effort
            }
            return;
        }

        DeploymentRecord record = recordOpt.get();
        Optional<Artifact> artifactOpt = artifactRepository.findById(record.getArtifactId());
        if (artifactOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("text/html;charset=UTF-8");
            try {
                response.getWriter().write(buildErrorPage("404 - Artifact Not Found",
                        "The artifact associated with this deployment no longer exists."));
            } catch (Exception ignored) {
                // best-effort
            }
            return;
        }

        Artifact artifact = artifactOpt.get();
        String content = artifact.getContent() == null ? "" : artifact.getContent();
        String title = artifact.getTitle() == null ? "Untitled" : artifact.getTitle();
        String type = artifact.getType() == null ? "" : artifact.getType();
        String language = artifact.getLanguage() == null ? "" : artifact.getLanguage();

        response.setContentType("text/html;charset=UTF-8");
        try {
            if (isWebPreview(type, content)) {
                // WEB_PREVIEW: return the HTML content directly
                response.getWriter().write(content);
            } else if (isMarkdown(type, language)) {
                response.getWriter().write(buildMarkdownPage(title, content, record));
            } else {
                response.getWriter().write(buildCodePage(title, content, language, record));
            }
        } catch (Exception ignored) {
            // best-effort
        }
    }

    private boolean isWebPreview(String type, String content) {
        return "WEB_PREVIEW".equals(type) && content.trim().startsWith("<");
    }

    private boolean isMarkdown(String type, String language) {
        return "MARKDOWN".equals(type)
                || "REVIEW_REPORT".equals(type)
                || "markdown".equalsIgnoreCase(language)
                || "md".equalsIgnoreCase(language);
    }

    // ── HTML Templates ──────────────────────────────────────────────────

    private String buildCodePage(String title, String code, String language, DeploymentRecord record) {
        String langClass = "language-" + resolvePrismLanguage(language);
        return "<!DOCTYPE html><html lang=\"en\"><head>"
                + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + escapeHtml(title) + " - AgentHub Deploy</title>"
                + "<link href=\"https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css\" rel=\"stylesheet\">"
                + "<style>"
                + "body{margin:0;background:#1e1e2e;color:#cdd6f4;font-family:'JetBrains Mono',monospace;}"
                + ".deploy-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;"
                + "background:#181825;border-bottom:1px solid #313244;font-size:12px;color:#a6adc8;}"
                + ".deploy-bar a{color:#89b4fa;text-decoration:none;}"
                + ".deploy-bar a:hover{text-decoration:underline;}"
                + ".deploy-title{padding:20px 24px 0;font-size:20px;font-weight:700;color:#cdd6f4;}"
                + ".deploy-meta{padding:4px 24px 16px;font-size:11px;color:#6c7086;}"
                + "pre{margin:0;padding:20px 24px;overflow:auto;min-height:60vh;}"
                + "code{font-size:13px;line-height:1.6;}"
                + ".badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;"
                + "font-weight:700;background:#313244;color:#a6adc8;margin-left:8px;}"
                + "</style></head><body>"
                + "<div class=\"deploy-bar\">"
                + "<span>AgentHub Static Deploy</span>"
                + "<a href=\"/workspace\">&larr; Back to Workspace</a></div>"
                + "<div class=\"deploy-title\">" + escapeHtml(title)
                + "<span class=\"badge\">" + escapeHtml(language) + "</span></div>"
                + "<div class=\"deploy-meta\">Deployment " + escapeHtml(record.getDeploymentId())
                + " &middot; " + escapeHtml(record.getDeployTarget()) + "</div>"
                + "<pre><code class=\"" + langClass + "\">" + escapeHtml(code) + "</code></pre>"
                + "<script src=\"https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js\"></script>"
                + prismAutoloaderScript(language)
                + "</body></html>";
    }

    private String buildMarkdownPage(String title, String markdown, DeploymentRecord record) {
        // Use marked.js for client-side markdown rendering
        return "<!DOCTYPE html><html lang=\"en\"><head>"
                + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + escapeHtml(title) + " - AgentHub Deploy</title>"
                + "<style>"
                + "body{margin:0;background:#fafbf9;color:#1f2329;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}"
                + ".deploy-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;"
                + "background:#fff;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;}"
                + ".deploy-bar a{color:#2563eb;text-decoration:none;}"
                + ".deploy-bar a:hover{text-decoration:underline;}"
                + ".content{max-width:800px;margin:0 auto;padding:32px 24px;}"
                + "h1{font-size:28px;font-weight:900;letter-spacing:-0.03em;margin-top:0;}"
                + "h2{font-size:22px;font-weight:700;margin-top:1.5em;}"
                + "h3{font-size:18px;font-weight:700;margin-top:1.2em;}"
                + "p{line-height:1.7;}"
                + "pre{background:#f4f5f7;padding:16px;border-radius:8px;overflow-x:auto;}"
                + "code{font-size:13px;}"
                + "blockquote{border-left:3px solid #d1d5db;margin:0;padding:8px 16px;color:#6b7280;}"
                + "table{border-collapse:collapse;width:100%;}"
                + "th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;}"
                + "th{background:#f9fafb;font-weight:700;}"
                + "img{max-width:100%;border-radius:8px;}"
                + ".deploy-meta{font-size:11px;color:#9ca3af;margin-top:24px;padding-top:16px;"
                + "border-top:1px solid #e5e7eb;}"
                + "</style></head><body>"
                + "<div class=\"deploy-bar\">"
                + "<span>AgentHub Static Deploy</span>"
                + "<a href=\"/workspace\">&larr; Back to Workspace</a></div>"
                + "<div class=\"content\">"
                + "<div id=\"rendered\"></div>"
                + "<div class=\"deploy-meta\">Deployment " + escapeHtml(record.getDeploymentId())
                + " &middot; " + escapeHtml(record.getDeployTarget()) + "</div>"
                + "</div>"
                + "<script src=\"https://cdn.jsdelivr.net/npm/marked@12.0.1/marked.min.js\"></script>"
                + "<script>"
                + "document.getElementById('rendered').innerHTML=marked.parse("
                + escapeForJs(markdown) + ");"
                + "</script>"
                + "</body></html>";
    }

    private String buildErrorPage(String title, String message) {
        return "<!DOCTYPE html><html lang=\"en\"><head>"
                + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + escapeHtml(title) + "</title>"
                + "<style>"
                + "body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;"
                + "background:#f7f7f4;color:#1f2329;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}"
                + ".card{text-align:center;padding:40px;}"
                + "h1{font-size:24px;font-weight:900;}"
                + "p{color:#6b7280;font-size:14px;}"
                + "a{color:#2563eb;text-decoration:none;margin-top:16px;display:inline-block;}"
                + "</style></head><body>"
                + "<div class=\"card\"><h1>" + escapeHtml(title) + "</h1>"
                + "<p>" + escapeHtml(message) + "</p>"
                + "<a href=\"/workspace\">&larr; Back to Workspace</a></div>"
                + "</body></html>";
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private String resolvePrismLanguage(String language) {
        if (language == null) return "javascript";
        return switch (language.toLowerCase()) {
            case "js", "jsx", "javascript" -> "javascript";
            case "ts", "tsx", "typescript" -> "typescript";
            case "py", "python" -> "python";
            case "java" -> "java";
            case "json" -> "json";
            case "md", "markdown" -> "markdown";
            case "css" -> "css";
            case "sh", "shell", "bash" -> "bash";
            case "yml", "yaml" -> "yaml";
            case "html", "xml", "svg" -> "markup";
            default -> "javascript";
        };
    }

    private String prismAutoloaderScript(String language) {
        String langKey = resolvePrismLanguage(language);
        // Only load extra languages if not already in the core set
        return switch (langKey) {
            case "javascript", "css", "markup", "json" -> ""; // included in prism core
            default -> "<script src=\"https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-"
                    + langKey + ".min.js\"></script>";
        };
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeForJs(String text) {
        if (text == null) return "''";
        // JSON-encode the string for safe embedding in a JS context
        try {
            return objectMapper.writeValueAsString(text);
        } catch (Exception e) {
            return "'" + text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'";
        }
    }
}
