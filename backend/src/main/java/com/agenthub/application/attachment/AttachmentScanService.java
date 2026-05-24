package com.agenthub.application.attachment;

import java.nio.file.Path;

public interface AttachmentScanService {

    ScanResult scan(String attachmentId, String fileName, Path storagePath);

    record ScanResult(String status, String summary) {

        public ScanResult {
            status = status == null || status.isBlank() ? "SKIPPED" : status.trim();
            summary = summary == null || summary.isBlank() ? "No scan summary." : summary.trim();
        }
    }
}
