package com.example.civic_sense.realtime;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Pushes complaint changes to every open dashboard using
 * Server-Sent Events (SSE). No extra infrastructure needed:
 * the browser keeps one HTTP connection open to
 * GET /api/stream and reconnects automatically.
 *
 * Event name: "complaint"
 * Payload:    { type, complaintId, masterId, complaint, at }
 * Types:      CREATED | MERGED | UPDATED | SEVERITY | ESCALATED
 */
@Service
public class RealtimeService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeService.class);

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final CopyOnWriteArrayList<Client> clients = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(User user) {

        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        Client client = new Client(emitter, user.getId(), user.getRole().name());

        clients.add(client);

        emitter.onCompletion(() -> clients.remove(client));
        emitter.onTimeout(() -> {
            clients.remove(client);
            emitter.complete();
        });
        emitter.onError(e -> clients.remove(client));

        Map<String, Object> hello = new LinkedHashMap<>();
        hello.put("connected", true);
        hello.put("role", client.role);
        hello.put("at", LocalDateTime.now().toString());

        send(client, SseEmitter.event().name("hello").data(hello, MediaType.APPLICATION_JSON));

        return emitter;
    }

    /** Broadcast a complaint change to every connected dashboard. */
    public void publish(String type, Complaint complaint) {

        if (complaint == null || clients.isEmpty()) {
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", type);
        payload.put("complaintId", complaint.getId());
        payload.put("masterId", complaint.getMergedIntoId() != null
                ? complaint.getMergedIntoId()
                : complaint.getId());
        payload.put("complaint", complaint);
        payload.put("at", LocalDateTime.now().toString());

        for (Client client : clients) {
            send(client, SseEmitter.event()
                    .name("complaint")
                    .data(payload, MediaType.APPLICATION_JSON));
        }
    }

    public int connectedClients() {
        return clients.size();
    }

    /** Keeps proxies (Render, Nginx...) from closing idle connections. */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        for (Client client : clients) {
            send(client, SseEmitter.event().comment("ping"));
        }
    }

    private void send(Client client, SseEmitter.SseEventBuilder event) {
        // SseEmitter is not thread-safe: one writer at a time per client
        synchronized (client) {
            try {
                client.emitter.send(event);
            } catch (IOException | IllegalStateException e) {
                clients.remove(client);
                log.debug("Dropping SSE client {}: {}", client.userId, e.getMessage());
            }
        }
    }

    private record Client(SseEmitter emitter, Long userId, String role) {
    }
}
