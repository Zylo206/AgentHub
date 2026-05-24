package com.agenthub.application.attachment;

import java.nio.file.Path;
import org.springframework.stereotype.Service;

@Service
public class NoopAttachmentScanService implements AttachmentScanService {

    @Override
    public ScanResult scan(String attachmentId, String fileName, Path storagePath) {
        return new ScanResult("CLEAN", "No-op local scan completed. No external antivirus engine is configured.");
    }
}
