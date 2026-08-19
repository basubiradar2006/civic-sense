package com.example.civic_sense.repository;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long> {

    // Complaints created by a citizen
    List<Complaint> findByUser(User user);

    // Complaints assigned to a contractor
    List<Complaint> findByContractor(User contractor);
}