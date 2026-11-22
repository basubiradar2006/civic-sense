package com.example.civic_sense;

import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.UserRepository;
import com.example.civic_sense.security.JwtService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.web.ServletTestExecutionListener;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:civicpulse_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "civic.severity.road-index=",
        "civic.severity.vehicle-count.csv=",
        "civic.severity.initial-delay-ms=3600000",
})
@TestExecutionListeners({ServletTestExecutionListener.class, DependencyInjectionTestExecutionListener.class})
class CivicSenseApplicationTests {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired ComplaintRepository complaints;
    @Autowired JwtService jwt;

    private MockMvc mvc;
    private User citizen;
    private User officer;
    private User contractor;

    @BeforeEach
    void prepare() {
        mvc = webAppContextSetup(context).apply(springSecurity()).build();
        citizen = createUser(Role.CITIZEN);
        officer = createUser(Role.OFFICER);
        contractor = createUser(Role.CONTRACTOR);
    }

    @Test
    void citizenSubmissionOfficerCorrectionAndExistingAssignmentWorkflow() throws Exception {
        int id = submit("""
                {"category":"Pothole","description":"Shallow pothole","latitude":15.85,"longitude":74.51,
                 "accuracy":5,"hazardEvidence":{"widthCm":10,"depthCm":1.5,"position":"SHOULDER"},
                 "severityAssessment":{"priority":"CRITICAL"},"priority":"CRITICAL","status":"ASSIGNED"}
                """);
        String path = "/api/complaints/" + id;
        var created = complaints.findById((long) id).orElseThrow();
        assertEquals("LOW", created.getPriority());
        assertEquals("PENDING", created.getStatus());
        assertEquals("INDEX_UNAVAILABLE", created.getSeverityAssessment().roadMatchStatus());

        mvc.perform(get(path).header("Authorization", bearer(citizen)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.severityAssessment.priority").value("LOW"))
                .andExpect(jsonPath("$.severityAssessment.explanation").isNotEmpty());
        mvc.perform(get("/api/complaints/nearby")
                        .param("latitude", "15.85").param("longitude", "74.51")
                        .header("Authorization", bearer(citizen)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].priority").value("LOW"))
                .andExpect(jsonPath("$[0].severityScore").value(11.5));

        String correction = """
                {"evidence":{"widthCm":25,"depthCm":5,"position":"TRAVEL_LANE"},
                 "roadId":"UNMATCHED","priority":"HIGH","reason":"Verified lane obstruction"}
                """;
        mvc.perform(put(path + "/severity/review").contentType("application/json").content(correction))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(path + "/severity/review").header("Authorization", bearer(citizen))
                        .contentType("application/json").content(correction))
                .andExpect(status().isForbidden());
        mvc.perform(get(path + "/severity/roads").header("Authorization", bearer(contractor)))
                .andExpect(status().isForbidden());
        mvc.perform(get(path + "/severity/roads").header("Authorization", bearer(officer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.candidates").isArray());
        mvc.perform(put(path + "/severity/review").header("Authorization", bearer(officer))
                        .contentType("application/json").content(correction))
                .andExpect(status().isOk()).andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.severityAssessment.verificationStatus").value("OFFICER_REVIEWED"))
                .andExpect(jsonPath("$.severityAssessment.roadMatchStatus").value("OFFICER_UNMATCHED"))
                .andExpect(jsonPath("$.severityReviews").doesNotExist());
        assertEquals("Verified lane obstruction", complaints.findById((long) id).orElseThrow()
                .getSeverityReviews().get(0).reason());

        mvc.perform(post("/api/complaints/severity/recompute").header("Authorization", bearer(officer)))
                .andExpect(status().isOk());
        assertEquals("HIGH", complaints.findById((long) id).orElseThrow().getPriority());
        mvc.perform(put(path + "/verify").header("Authorization", bearer(citizen)))
                .andExpect(status().isForbidden());
        mvc.perform(put(path + "/verify").header("Authorization", bearer(officer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("VERIFIED"));
        mvc.perform(put(path + "/assign/" + contractor.getId()).header("Authorization", bearer(officer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.contractor.id").value(contractor.getId().intValue()));
        mvc.perform(put(path + "/start").header("Authorization", bearer(contractor)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void submissionWithoutHazardMeasurementsGetsAnAutomaticCategoryEstimate() throws Exception {
        int id = submit("""
                {"category":"Pothole","description":"Pothole reported with no size measurements"}
                """);
        mvc.perform(get("/api/complaints/" + id).header("Authorization", bearer(citizen)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.severityAssessment.score").value(35.0))
                .andExpect(jsonPath("$.severityAssessment.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.severityAssessment.evidenceCompleteness").value(0))
                .andExpect(jsonPath("$.severityAssessment.verificationStatus").value("NEEDS_REVIEW"));
    }

    @Test
    void emergencyCannotBeDowngradedWhileEmergencyEvidenceRemains() throws Exception {
        int id = submit("""
                {"category":"Fallen Electric Pole","description":"Wires in the street",
                 "hazardEvidence":{"condition":"FALLEN","exposedWires":true}}
                """);
        mvc.perform(put("/api/complaints/" + id + "/severity/review").header("Authorization", bearer(officer))
                        .contentType("application/json").content("""
                                {"evidence":{"condition":"FALLEN","exposedWires":true},
                                 "priority":"LOW","reason":"Cleanup scheduled"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.priority").value("CRITICAL"))
                .andExpect(jsonPath("$.severityScore").value(100.0))
                .andExpect(jsonPath("$.severityAssessment.emergencyRule").isNotEmpty());
    }

    @Test
    void publicRegistrationCannotGrantOfficerPrivileges() throws Exception {
        mvc.perform(post("/api/auth/register").contentType("application/json").content("""
                {"email":"unauthorized-officer@example.test","name":"Unauthorised","password":"test","role":"OFFICER"}
                """)).andExpect(status().isForbidden());
    }

    private int submit(String body) throws Exception {
        String response = mvc.perform(post("/api/complaints").header("Authorization", bearer(citizen))
                        .contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.submissionResult").value("NEW"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private User createUser(Role role) {
        User user = new User();
        user.setName(role.name());
        user.setEmail(role.name().toLowerCase() + "-" + java.util.UUID.randomUUID() + "@example.test");
        user.setPassword("test");
        user.setRole(role);
        return users.save(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwt.generateToken(user.getEmail(), user.getRole().name());
    }
}
