package com.agenthub.application.attachment;

import org.springframework.stereotype.Service;

@Service
public class NoopAttachmentCleanupService implements AttachmentCleanupService {

    @Override
    public int cleanupExpiredOrphans() {
        return 0;
    }
}
