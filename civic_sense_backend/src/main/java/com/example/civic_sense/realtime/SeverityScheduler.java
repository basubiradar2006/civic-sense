package com.example.civic_sense.realtime;

import com.example.civic_sense.service.ComplaintService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Time-based work:
 *  - escalate complaints that passed their SLA deadline
 *  - re-score open complaints (the SLA factor grows over time)
 */
@Component
public class SeverityScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeverityScheduler.class);

    private final ComplaintService complaintService;

    public SeverityScheduler(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @Scheduled(initialDelayString = "${civic.severity.initial-delay-ms:30000}",
            fixedDelayString = "${civic.severity.recompute-interval-ms:600000}")
    public void run() {
        try {
            complaintService.escalateOverdue();
            int count = complaintService.recomputeAllOpen();
            log.info("Severity recomputed for {} open complaints", count);
        } catch (Exception e) {
            log.warn("Scheduled severity job failed: {}", e.getMessage());
        }
    }
}
